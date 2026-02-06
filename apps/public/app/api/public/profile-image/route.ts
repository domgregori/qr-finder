import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminNotifyUrl = process.env.ADMIN_INTERNAL_URL || "http://admin:3000";
  const internalSecret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "Missing secret" }, { status: 500 });
  }

  try {
    const profileRes = await fetch(`${adminNotifyUrl}/api/internal/profile`, {
      method: "GET",
      headers: { "x-internal-secret": internalSecret }
    });

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Profile unavailable" }, { status: 502 });
    }

    const profile = await profileRes.json();
    const avatarPath = profile?.avatarPath as string | null;
    if (!avatarPath) {
      return new NextResponse(null, { status: 204 });
    }

    const encodedPath = avatarPath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const fileRes = await fetch(`${adminNotifyUrl}/api/files/${encodedPath}`, {
      method: "GET"
    });

    if (!fileRes.ok) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 502 });
    }

    const contentType = fileRes.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await fileRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    console.error("Profile image proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
