import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.device.update({
      where: { id },
      data: { lastScanViewedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark scans viewed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
