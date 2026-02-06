import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { sendAppriseNotification } from "@shared/lib/apprise";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const type = body?.type;
    const deviceId = body?.deviceId;
    const deviceName = body?.deviceName;

    if (!type || !deviceId || !deviceName) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    let title = "Lost & Found Alert";
    let messageBody = `Someone scanned the QR code for: ${deviceName}`;

    if (type === "message") {
      const nickname = body?.nickname || "Anonymous";
      const message = body?.message || "";
      title = `New Message for ${deviceName}`;
      messageBody = `From: ${nickname}\n\n${message}`;
    }

    // 1) Device-specific Apprise URL
    if (device.appriseUrl) {
      try {
        const result = await sendAppriseNotification(device.appriseUrl, title, messageBody);
        if (!result.ok) {
          console.error("Device Apprise notification failed:", result.error);
        }
      } catch (e) {
        console.error("Failed to send device Apprise notification:", e);
      }
    }

    // 2) Global Apprise endpoints
    try {
      const globalEndpoints = await prisma.appriseEndpoint.findMany();
      for (const endpoint of globalEndpoints) {
        try {
          const result = await sendAppriseNotification(endpoint.url, title, messageBody);
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Internal notify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
