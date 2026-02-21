import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@shared/lib/auth-options";
import { prisma } from "@shared/lib/db";
import { sanitizeNickname, sanitizeMessage } from "@shared/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const messages = await prisma.message.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all messages for a device
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

    await prisma.message.deleteMany({
      where: { deviceId: id }
    });

    return NextResponse.json({ success: true, message: "All messages cleared" });
  } catch (error) {
    console.error("Delete messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id ?? "";

    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { nickname: rawNickname, message: rawMessage } = body ?? {};

    // Sanitize inputs
    const nickname = sanitizeNickname(rawNickname);
    const message = sanitizeMessage(rawMessage);

    if (!nickname || !message) {
      return NextResponse.json(
        { error: "Nickname and message are required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { id }
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const newMessage = await prisma.message.create({
      data: {
        deviceId: id,
        nickname,
        message,
        isOwnerReply: !!session
      }
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Create message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
