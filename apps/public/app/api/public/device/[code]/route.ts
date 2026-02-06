import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { getFileUrl } from "@shared/lib/storage";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@shared/lib/rate-limit";

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
            type: "scan",
            deviceId: device.id,
            deviceName: device.name
          })
        });
      } catch (e) {
        console.error("Failed to notify admin app:", e);
      }
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
