/**
 * Storage abstraction layer for file uploads
 * Supports both local filesystem and S3 storage
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

// Ensure uploads directory exists for local storage
async function ensureUploadsDir() {
  if (STORAGE_TYPE === "local") {
    try {
      await fs.mkdir(path.join(process.cwd(), UPLOADS_DIR), { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  }
}

/**
 * Check if using local storage
 */
export function isLocalStorage(): boolean {
  return STORAGE_TYPE === "local" || !process.env.AWS_BUCKET_NAME;
}

/**
 * Generate a presigned upload URL or local upload path
 */
export async function generateUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = true
): Promise<{ uploadUrl: string; cloud_storage_path: string; isLocal: boolean }> {
  if (isLocalStorage()) {
    await ensureUploadsDir();
    const ext = path.extname(fileName);
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    const storagePath = `uploads/${uniqueName}`;
    
    return {
      uploadUrl: `/api/upload/local`,
      cloud_storage_path: storagePath,
      isLocal: true
    };
  }

  // Use S3 storage
  const { generatePresignedUploadUrl } = await import("./s3");
  const result = await generatePresignedUploadUrl(fileName, contentType, isPublic);
  return { ...result, isLocal: false };
}

/**
 * Get file URL for viewing/downloading
 */
export async function getFileUrl(
  storagePath: string,
  isPublic: boolean = true
): Promise<string> {
  if (isLocalStorage() || storagePath.startsWith("uploads/")) {
    // Return relative URL for local files
    return `/api/files/${encodeURIComponent(storagePath)}`;
  }

  // Use S3 storage
  const { getFileUrl: s3GetFileUrl } = await import("./s3");
  return s3GetFileUrl(storagePath, isPublic);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
  if (isLocalStorage() || storagePath.startsWith("uploads/")) {
    try {
      const fullPath = path.join(process.cwd(), storagePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error("Failed to delete local file:", error);
    }
    return;
  }

  // Use S3 storage
  const { deleteFile: s3DeleteFile } = await import("./s3");
  await s3DeleteFile(storagePath);
}

/**
 * Save file to local storage
 */
export async function saveLocalFile(
  storagePath: string,
  buffer: Buffer
): Promise<void> {
  await ensureUploadsDir();
  const fullPath = path.join(process.cwd(), storagePath);
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

/**
 * Read file from local storage
 */
export async function readLocalFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(process.cwd(), storagePath);
  return fs.readFile(fullPath);
}
