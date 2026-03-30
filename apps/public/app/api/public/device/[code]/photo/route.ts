import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { getClientIp, checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@shared/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code?: string }> | { code?: string } }
) {
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`public-photo:${clientIp}`, RATE_LIMITS.PUBLIC_READ);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const resolvedParams = await params;
    const code = resolvedParams?.code ?? "";

    const device = await prisma.device.findUnique({
      where: { uniqueCode: code },
      select: { photoUrl: true }
    });

    if (!device?.photoUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const storagePath = device.photoUrl;
    if (!storagePath.startsWith("uploads/")) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const adminNotifyUrl = process.env.ADMIN_INTERNAL_URL || "http://admin:3000";
    const encodedPath = storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const upstream = await fetch(`${adminNotifyUrl}/api/files/${encodedPath}`, {
      method: "GET"
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    console.error("Public photo proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
