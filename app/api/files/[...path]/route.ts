import { NextRequest, NextResponse } from "next/server";
import { readLocalFile } from "@/lib/storage";
import path from "path";

export const dynamic = "force-dynamic";

// MIME types for common image formats
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join("/");
    
    // Security: Only allow files from uploads directory
    if (!filePath.startsWith("uploads/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes("..") || !normalizedPath.startsWith("uploads")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const buffer = await readLocalFile(normalizedPath);
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File read error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
