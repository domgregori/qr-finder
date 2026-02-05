import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { customAlphabet } from "nanoid";

export const dynamic = "force-dynamic";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function POST(
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

    // Parse request body for options
    let clearMessages = false;
    try {
      const body = await req.json();
      clearMessages = body?.clearMessages === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Generate a new unique code
    const newCode = generateCode();

    // Update device with new code and optionally clear messages
    if (clearMessages) {
      // Delete all messages and update code in a transaction
      await prisma.$transaction([
        prisma.message.deleteMany({
          where: { deviceId: params.id }
        }),
        prisma.device.update({
          where: { id: params.id },
          data: { uniqueCode: newCode }
        })
      ]);
    } else {
      // Just update the code
      await prisma.device.update({
        where: { id: params.id },
        data: { uniqueCode: newCode }
      });
    }

    // Fetch and return the updated device with messages
    const updatedDevice = await prisma.device.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return NextResponse.json({
      success: true,
      device: updatedDevice,
      message: clearMessages 
        ? "QR code regenerated and messages cleared" 
        : "QR code regenerated. Previous URL is now invalid."
    });
  } catch (error) {
    console.error("Regenerate code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
