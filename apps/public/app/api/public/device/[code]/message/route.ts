import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { sanitizeNickname, sanitizeMessage } from "@shared/lib/sanitize";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@shared/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code?: string }> | { code?: string } }
) {
  // Rate limit check
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`public-message:${clientIp}`, RATE_LIMITS.PUBLIC_WRITE);
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const resolvedParams = await params;
    const code = resolvedParams?.code ?? "";

    const body = await req.json();
    const { nickname: rawNickname, message: rawMessage } = body ?? {};
    const rawMessageText = typeof rawMessage === "string" ? rawMessage.trim() : "";
    if (rawMessageText.length > 200) {
      return NextResponse.json(
        { error: "Message must be 200 characters or less" },
        { status: 400 }
      );
    }
    
    // Sanitize inputs
    const nickname = sanitizeNickname(rawNickname);
    const message = sanitizeMessage(rawMessage);

    if (!nickname || !message) {
      return NextResponse.json(
        { error: "Nickname and message are required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { uniqueCode: code }
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

    // Notify admin app to send Apprise notifications (keeps endpoints private)
    const adminNotifyUrl = process.env.ADMIN_INTERNAL_URL || "http://admin:3000";
    const internalSecret = process.env.INTERNAL_NOTIFY_SECRET;
    if (internalSecret) {
      try {
        await fetch(`${adminNotifyUrl}/api/internal/notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret
          },
          body: JSON.stringify({
            type: "message",
            deviceId: device.id,
            deviceName: device.name,
            nickname,
            message
          })
        });
      } catch (e) {
        console.error("Failed to notify admin app:", e);
      }
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
