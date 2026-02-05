import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { sanitizeDeviceName, sanitizeDescription, sanitizeUrl } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const device = await prisma.device.findUnique({
      where: { id: params?.id ?? "" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json(device);
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name: rawName, description: rawDescription, appriseUrl: rawAppriseUrl, photoUrl, isPublicPhoto } = body ?? {};

    // Sanitize inputs
    const name = rawName ? sanitizeDeviceName(rawName) : undefined;
    const description = rawDescription !== undefined ? (rawDescription ? sanitizeDescription(rawDescription) : null) : undefined;
    const appriseUrl = rawAppriseUrl !== undefined ? (rawAppriseUrl ? sanitizeUrl(rawAppriseUrl) : null) : undefined;

    const device = await prisma.device.update({
      where: { id: params?.id ?? "" },
      data: {
        name,
        description,
        appriseUrl,
        photoUrl: photoUrl ?? undefined,
        isPublicPhoto: isPublicPhoto ?? undefined
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const device = await prisma.device.findUnique({
      where: { id: params?.id ?? "" }
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
      where: { id: params?.id ?? "" }
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
