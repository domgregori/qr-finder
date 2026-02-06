import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";
import { getFileUrl, deleteFile } from "@shared/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, name: true, bio: true, avatarUrl: true, avatarShape: true }
    });

    const avatarDisplayUrl = user?.avatarUrl ? await getFileUrl(user.avatarUrl, true) : null;

    return NextResponse.json({
      email: user?.email ?? null,
      name: user?.name ?? null,
      bio: user?.bio ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      avatarDisplayUrl,
      avatarShape: user?.avatarShape ?? null
    });
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bio: rawBio, avatarUrl, avatarShape, removeAvatar } = body ?? {};

    const bio = typeof rawBio === "string" ? rawBio.trim().slice(0, 1000) : null;
    const shape = typeof avatarShape === "string" ? avatarShape : null;
    const validShape = shape === "circle" || shape === "rounded" || shape === "square" ? shape : null;

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { avatarUrl: true }
    });

    let nextAvatarUrl: string | null | undefined = typeof avatarUrl === "string" ? avatarUrl : undefined;
    if (removeAvatar) {
      nextAvatarUrl = null;
      if (existing?.avatarUrl) {
        await deleteFile(existing.avatarUrl);
      }
    } else if (typeof avatarUrl === "string" && existing?.avatarUrl && existing.avatarUrl !== avatarUrl) {
      await deleteFile(existing.avatarUrl);
    }

    const user = await prisma.user.update({
      where: { email },
      data: {
        bio,
        avatarUrl: nextAvatarUrl,
        avatarShape: validShape ?? undefined
      }
    });

    return NextResponse.json({ ok: true, bio: user.bio, avatarUrl: user.avatarUrl, avatarShape: user.avatarShape });
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
