import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const data = body?.data;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Layout name cannot be empty" }, { status: 400 });
    }

    if (data !== undefined && (!data || typeof data !== "object")) {
      return NextResponse.json({ error: "Invalid layout data" }, { status: 400 });
    }

    const existing = await prisma.printLayout.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    const updated = await prisma.printLayout.update({
      where: { id },
      data: {
        name: name !== undefined ? name.slice(0, 80) : undefined,
        data: data !== undefined ? data : undefined,
      },
      select: {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update print layout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const existing = await prisma.printLayout.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    await prisma.printLayout.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete print layout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
