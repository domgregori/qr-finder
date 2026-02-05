import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all Apprise endpoints
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const endpoints = await prisma.appriseEndpoint.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(endpoints);
  } catch (error) {
    console.error("Failed to fetch endpoints:", error);
    return NextResponse.json({ error: "Failed to fetch endpoints" }, { status: 500 });
  }
}

// POST - Create new Apprise endpoint
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, url } = await request.json();

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    const endpoint = await prisma.appriseEndpoint.create({
      data: { name, url },
    });

    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("Failed to create endpoint:", error);
    return NextResponse.json({ error: "Failed to create endpoint" }, { status: 500 });
  }
}
