import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { customAlphabet } from "nanoid";
import { generatePresignedUploadUrl } from "@/lib/s3";
import { sanitizeDeviceName, sanitizeDescription, sanitizeUrl } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const devices = await prisma.device.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("Get devices error:", error);
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
    const { name: rawName, description: rawDescription, appriseUrl: rawAppriseUrl, photoUrl, isPublicPhoto } = body ?? {};

    // Sanitize inputs
    const name = sanitizeDeviceName(rawName);
    const description = rawDescription ? sanitizeDescription(rawDescription) : null;
    const appriseUrl = rawAppriseUrl ? sanitizeUrl(rawAppriseUrl) : null;

    if (!name) {
      return NextResponse.json(
        { error: "Device name is required" },
        { status: 400 }
      );
    }

    const uniqueCode = nanoid();

    const device = await prisma.device.create({
      data: {
        name,
        description,
        appriseUrl,
        photoUrl: photoUrl ?? null,
        isPublicPhoto: isPublicPhoto ?? false,
        uniqueCode
      }
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error("Create device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
