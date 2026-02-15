import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { getFileUrl } from "@shared/lib/storage";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@shared/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code?: string }> | { code?: string } }
) {
  // Rate limit check
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`public-device:${clientIp}`, RATE_LIMITS.PUBLIC_READ);
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const resolvedParams = await params;
    const code = resolvedParams?.code ?? "";

    const device = await prisma.device.findUnique({
      where: { uniqueCode: code },
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
        if (photoDisplayUrl.startsWith("/api/files/")) {
          photoDisplayUrl = `/api/public/device/${encodeURIComponent(code)}/photo`;
        }
      } catch (e) {
        console.error("Failed to get photo URL:", e);
      }
    }

    // Load public profile info via admin app (keeps user table private)
    let profileBlurb: string | null = null;
    let profileAvatarUrl: string | null = null;
    if (device.includeBio) {
      try {
        const adminNotifyUrl = process.env.ADMIN_INTERNAL_URL || "http://admin:3000";
        const internalSecret = process.env.INTERNAL_NOTIFY_SECRET;
        if (internalSecret) {
          const res = await fetch(`${adminNotifyUrl}/api/internal/profile`, {
            method: "GET",
            headers: {
              "x-internal-secret": internalSecret
            }
          });
          if (res.ok) {
            const data = await res.json();
            profileBlurb = data?.bio ?? null;
          profileAvatarUrl = data?.avatarPath ? "/api/public/profile-image" : (data?.avatarDisplayUrl ?? null);
        }
      }
      } catch (e) {
        console.error("Failed to load profile info:", e);
      }
    }

    const scanCookieName = `qr_scan_${device.id}`;
    const hasScanCookie = req.cookies.get(scanCookieName)?.value === "1";

    // Notify admin app to send Apprise notifications (keeps endpoints private)
    if (!hasScanCookie) {
      try {
        await prisma.deviceScan.create({
          data: { deviceId: device.id }
        });
      } catch (e) {
        console.error("Failed to persist device scan:", e);
      }

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
    }

    const response = NextResponse.json({
      id: device.id,
      name: device.name,
      description: device.description,
      photoUrl: photoDisplayUrl,
      uniqueCode: device.uniqueCode,
      messages: device.messages ?? [],
      includeBio: device.includeBio ?? true,
      profileBlurb,
      profileAvatarUrl,
    });
    if (!hasScanCookie) {
      response.cookies.set(scanCookieName, "1", {
        path: "/",
        httpOnly: false,
        sameSite: "lax"
      });
    }
    return response;
  } catch (error) {
    console.error("Get public device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
