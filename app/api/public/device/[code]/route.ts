import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/storage";
import { sendAppriseNotification } from "@/lib/apprise";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  // Rate limit check
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`public-device:${clientIp}`, RATE_LIMITS.PUBLIC_READ);
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const device = await prisma.device.findUnique({
      where: { uniqueCode: params?.code ?? "" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Get signed URL for photo if exists
    let photoDisplayUrl = null;
    if (device?.photoUrl) {
      try {
        photoDisplayUrl = await getFileUrl(device.photoUrl, device.isPublicPhoto);
      } catch (e) {
        console.error("Failed to get photo URL:", e);
      }
    }

    // Trigger Apprise notifications
    const notificationTitle = "Lost & Found Alert";
    const notificationBody = `Someone scanned the QR code for: ${device.name}`;

    // 1. Send to device-specific Apprise URL if configured
    if (device?.appriseUrl) {
      try {
        const result = await sendAppriseNotification(device.appriseUrl, notificationTitle, notificationBody);
        if (!result.ok) {
          console.error("Device Apprise notification failed:", result.error);
        }
      } catch (e) {
        console.error("Failed to send device Apprise notification:", e);
      }
    }

    // 2. Send to all global Apprise endpoints
    try {
      const globalEndpoints = await prisma.appriseEndpoint.findMany();
      for (const endpoint of globalEndpoints) {
        try {
          const result = await sendAppriseNotification(endpoint.url, notificationTitle, notificationBody);
          if (!result.ok) {
            console.error(`Global endpoint ${endpoint.name} failed:`, result.error);
          }
        } catch (e) {
          console.error(`Failed to send to endpoint ${endpoint.name}:`, e);
        }
      }
    } catch (e) {
      console.error("Failed to fetch global endpoints:", e);
    }

    return NextResponse.json({
      id: device.id,
      name: device.name,
      description: device.description,
      photoUrl: photoDisplayUrl,
      uniqueCode: device.uniqueCode,
      messages: device.messages ?? []
    });
  } catch (error) {
    console.error("Get public device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
