import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAppriseNotification } from "@/lib/apprise";
import { sanitizeNickname, sanitizeMessage } from "@/lib/sanitize";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  // Rate limit check
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`public-message:${clientIp}`, RATE_LIMITS.PUBLIC_WRITE);
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await req.json();
    const { nickname: rawNickname, message: rawMessage, turnstileToken } = body ?? {};
    
    // Sanitize inputs
    const nickname = sanitizeNickname(rawNickname);
    const message = sanitizeMessage(rawMessage);

    // Verify Turnstile token
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && turnstileToken) {
      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${turnstileSecret}&response=${turnstileToken}`
        }
      );
      const verification = await verifyRes.json();
      if (!verification?.success) {
        return NextResponse.json(
          { error: "Captcha verification failed" },
          { status: 400 }
        );
      }
    }

    if (!nickname || !message) {
      return NextResponse.json(
        { error: "Nickname and message are required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { uniqueCode: params?.code ?? "" }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const newMessage = await prisma.message.create({
      data: {
        deviceId: device.id,
        nickname,
        message,
        isOwnerReply: false
      }
    });

    // Send Apprise notifications for new message
    const notificationTitle = `New Message for ${device.name}`;
    const notificationBody = `From: ${nickname}\n\n${message}`;

    // 1. Send to device-specific Apprise URL if configured
    if (device.appriseUrl) {
      try {
        await sendAppriseNotification(device.appriseUrl, notificationTitle, notificationBody);
      } catch (e) {
        console.error("Failed to send device Apprise notification:", e);
      }
    }

    // 2. Send to all global Apprise endpoints
    try {
      const globalEndpoints = await prisma.appriseEndpoint.findMany();
      for (const endpoint of globalEndpoints) {
        try {
          await sendAppriseNotification(endpoint.url, notificationTitle, notificationBody);
        } catch (e) {
          console.error(`Failed to send to endpoint ${endpoint.name}:`, e);
        }
      }
    } catch (e) {
      console.error("Failed to fetch global endpoints:", e);
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Create public message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
