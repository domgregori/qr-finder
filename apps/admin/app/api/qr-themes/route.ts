import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const themes = await prisma.qrTheme.findMany({
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json(themes);
  } catch (error) {
    console.error("Get themes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, settings } = body ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Theme name is required" }, { status: 400 });
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Theme settings are required" }, { status: 400 });
    }

    const theme = await prisma.qrTheme.create({
      data: { name: name.trim(), settings }
    });

    return NextResponse.json(theme);
  } catch (error) {
    console.error("Create theme error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
