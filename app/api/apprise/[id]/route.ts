import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendAppriseNotification } from "@/lib/apprise";

export const dynamic = "force-dynamic";

// GET - Get single endpoint
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const endpoint = await prisma.appriseEndpoint.findUnique({
      where: { id: params.id },
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("Failed to fetch endpoint:", error);
    return NextResponse.json({ error: "Failed to fetch endpoint" }, { status: 500 });
  }
}

// PUT - Update endpoint
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, url } = await request.json();

    const endpoint = await prisma.appriseEndpoint.update({
      where: { id: params.id },
      data: { name, url },
    });

    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("Failed to update endpoint:", error);
    return NextResponse.json({ error: "Failed to update endpoint" }, { status: 500 });
  }
}

// DELETE - Delete endpoint
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.appriseEndpoint.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete endpoint:", error);
    return NextResponse.json({ error: "Failed to delete endpoint" }, { status: 500 });
  }
}

// POST - Test notification
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const endpoint = await prisma.appriseEndpoint.findUnique({
      where: { id: params.id },
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    // Send test notification via Apprise URL parser
    const result = await sendAppriseNotification(
      endpoint.url,
      "Test Notification",
      `This is a test notification from Lost & Found Tracker.\n\nEndpoint: ${endpoint.name}\nTime: ${new Date().toLocaleString()}`
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Test notification sent!" });
  } catch (error) {
    console.error("Failed to send test notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification" },
      { status: 500 }
    );
  }
}
