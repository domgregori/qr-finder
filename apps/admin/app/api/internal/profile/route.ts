import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { getFileUrl } from "@shared/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const user = adminEmail
      ? await prisma.user.findUnique({
          where: { email: adminEmail },
          select: { email: true, name: true, bio: true, avatarUrl: true, avatarShape: true }
        })
      : await prisma.user.findFirst({
          select: { email: true, name: true, bio: true, avatarUrl: true, avatarShape: true }
        });

    const avatarDisplayUrl = user?.avatarUrl ? await getFileUrl(user.avatarUrl, true) : null;

    return NextResponse.json({
      email: user?.email ?? null,
      name: user?.name ?? null,
      bio: user?.bio ?? null,
      avatarDisplayUrl,
      avatarShape: user?.avatarShape ?? null
    });
  } catch (error) {
    console.error("Internal profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
