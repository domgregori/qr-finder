import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

// Returns public configuration needed by the admin dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      publicPortalUrl: process.env.PUBLIC_PORTAL_URL || null,
    });
  } catch (error) {
    console.error("Config fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
