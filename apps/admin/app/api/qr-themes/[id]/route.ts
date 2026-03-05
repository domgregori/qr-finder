import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function resolveThemeId(params: Promise<{ id?: string }> | { id?: string }) {
  const resolvedParams = await params;
  return resolvedParams?.id ?? "";
}

function isNotFoundPrismaError(error: unknown) {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2025")
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await resolveThemeId(params);
    if (!id) {
      return NextResponse.json({ error: "Theme id is required" }, { status: 400 });
    }

    const theme = await prisma.qrTheme.findUnique({
      where: { id }
    });

    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    return NextResponse.json(theme);
  } catch (error) {
    console.error("Get theme error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await resolveThemeId(params);
    if (!id) {
      return NextResponse.json({ error: "Theme id is required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, settings } = body ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Theme name is required" }, { status: 400 });
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Theme settings are required" }, { status: 400 });
    }

    const theme = await prisma.qrTheme.update({
      where: { id },
      data: {
        name: name.trim(),
        settings: settings as Prisma.JsonObject,
      }
    });

    return NextResponse.json(theme);
  } catch (error) {
    if (isNotFoundPrismaError(error)) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    console.error("Update theme error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await resolveThemeId(params);
    if (!id) {
      return NextResponse.json({ error: "Theme id is required" }, { status: 400 });
    }

    await prisma.qrTheme.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFoundPrismaError(error)) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    console.error("Delete theme error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
