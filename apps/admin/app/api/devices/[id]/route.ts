import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";
import { deleteFile, getFileUrl } from "@shared/lib/storage";
import { sanitizeDeviceName, sanitizeDescription, sanitizeUrl } from "@shared/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        },
        scans: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    let photoDisplayUrl: string | null = null;
    if (device.photoUrl) {
      try {
        photoDisplayUrl = await getFileUrl(device.photoUrl, device.isPublicPhoto);
      } catch (e) {
        console.error("Failed to get device photo URL:", e);
      }
    }

    const viewedAt = device.lastScanViewedAt;
    let newScanCount = 0;
    for (const scan of device.scans ?? []) {
      if (!viewedAt || scan.createdAt > viewedAt) {
        newScanCount += 1;
      }
    }

    return NextResponse.json({ ...device, photoDisplayUrl, newScanCount });
  } catch (error) {
    console.error("Get device error:", error);
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
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name: rawName,
      description: rawDescription,
      appriseUrl: rawAppriseUrl,
      appriseUrls: rawAppriseUrls,
      includeBio,
      photoUrl,
      isPublicPhoto,
      removePhoto,
      qrSettings
    } = body ?? {};

    // Sanitize inputs
    const name = rawName ? sanitizeDeviceName(rawName) : undefined;
    const description = rawDescription !== undefined ? (rawDescription ? sanitizeDescription(rawDescription) : null) : undefined;
    const appriseUrl = rawAppriseUrl !== undefined ? (rawAppriseUrl ? sanitizeUrl(rawAppriseUrl) : null) : undefined;
    const appriseUrls = rawAppriseUrls !== undefined
      ? Array.isArray(rawAppriseUrls)
        ? rawAppriseUrls
            .map((url) => (url ? sanitizeUrl(url) : null))
            .filter((url): url is string => Boolean(url))
        : []
      : undefined;

    const existing = await prisma.device.findUnique({
      where: { id },
      select: { photoUrl: true, isPublicPhoto: true }
    });

    if (removePhoto && existing?.photoUrl) {
      await deleteFile(existing.photoUrl);
    }
    if (
      typeof photoUrl === "string" &&
      existing?.photoUrl &&
      existing.photoUrl !== photoUrl
    ) {
      await deleteFile(existing.photoUrl);
    }

    const device = await prisma.device.update({
      where: { id },
      data: {
        name,
        description,
        appriseUrl: appriseUrls ? (appriseUrls[0] ?? null) : appriseUrl,
        appriseUrls,
        includeBio: includeBio !== undefined ? includeBio : undefined,
        photoUrl: removePhoto ? null : photoUrl ?? undefined,
        isPublicPhoto: isPublicPhoto ?? undefined,
        qrSettings: qrSettings !== undefined ? qrSettings : undefined
      }
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error("Update device error:", error);
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
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const device = await prisma.device.findUnique({
      where: { id }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Try to delete photo from storage if exists
    if (device?.photoUrl) {
      try {
        await deleteFile(device.photoUrl);
      } catch (e) {
        console.error("Failed to delete photo:", e);
      }
    }

    await prisma.device.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
