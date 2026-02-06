"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, ArrowLeft, Smartphone, Type, FileText, Bell,
  Image as ImageIcon, Upload, Check, AlertCircle, Plus
} from "lucide-react";

interface AppriseEndpoint {
  id: string;
  name: string;
  url: string;
}

export default function NewDevicePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [appriseUrl, setAppriseUrl] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState("");
  const [appriseEndpoints, setAppriseEndpoints] = useState<AppriseEndpoint[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isPublicPhoto, setIsPublicPhoto] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
    if (status === "authenticated") {
      fetchAppriseEndpoints();
    }
  }, [status, router]);

  const fetchAppriseEndpoints = async () => {
    try {
      const res = await fetch("/api/apprise");
      if (res.ok) {
        const data = await res.json();
        setAppriseEndpoints(data);
      }
    } catch (err) {
      console.error("Failed to fetch Apprise endpoints:", err);
    }
  };

  const handleEndpointChange = (value: string) => {
    setSelectedEndpoint(value);
    if (value && value !== "custom") {
      const endpoint = appriseEndpoints.find(e => e.id === value);
      setAppriseUrl(endpoint?.url || "");
    } else if (value === "custom") {
      setAppriseUrl("");
    } else {
      setAppriseUrl("");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      // Get upload configuration
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: isPublicPhoto
        })
      });

      if (!presignedRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, cloud_storage_path, useLocalUpload } = await presignedRes.json();

      if (useLocalUpload) {
        // Local storage: POST with FormData
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload/local", {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file");

        const { cloud_storage_path: localPath } = await uploadRes.json();
        setPhotoUrl(localPath);
      } else {
        // S3 storage: PUT to presigned URL
        // Check if content-disposition is in signed headers
        const urlParams = new URL(uploadUrl).searchParams;
        const signedHeaders = urlParams?.get?.("X-Amz-SignedHeaders") ?? "";
        const needsContentDisposition = signedHeaders.includes("content-disposition");

        const headers: Record<string, string> = { "Content-Type": file.type };
        if (needsContentDisposition) {
          headers["Content-Disposition"] = "attachment";
        }

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers,
          body: file
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file");

        setPhotoUrl(cloud_storage_path);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Device name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          appriseUrl: appriseUrl.trim() || null,
          photoUrl: photoUrl || null,
          isPublicPhoto
        })
      });

      if (!res.ok) throw new Error("Failed to create device");

      const device = await res.json();
      router.push(`/dashboard/devices/${device?.id ?? ""}/qr`);
    } catch (err) {
      console.error("Create error:", err);
      setError("Failed to create device");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="flex items-center gap-2">
              <MapPin size={24} className="text-orange-500" />
              <span className="font-bold text-gray-900 dark:text-white">Add New Device</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Smartphone size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Device Details</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add information about the device you want to track</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-6">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Type size={16} /> Device Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., MacBook Pro, Backpack, Car Keys"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText size={16} /> Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details to help identify the device..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ImageIcon size={16} /> Device Photo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click?.()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  photoUrl
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                  </div>
                ) : photoUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check size={32} className="text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-400">Photo uploaded</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Click to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={32} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload a photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Apprise Notification */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Bell size={16} /> Notification Endpoint
              </label>
              <select
                value={selectedEndpoint}
                onChange={(e) => handleEndpointChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">None (no notifications)</option>
                {appriseEndpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.name}
                  </option>
                ))}
                <option value="custom">Custom URL...</option>
              </select>
              
              {selectedEndpoint === "custom" && (
                <input
                  type="text"
                  value={appriseUrl}
                  onChange={(e) => setAppriseUrl(e.target.value)}
                  placeholder="e.g., ntfy://my-topic or tgram://bot:token/chatid"
                  className="w-full mt-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              )}
              
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get notified when someone scans this device&apos;s QR code
                </p>
                <Link
                  href="/dashboard/notifications"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Manage endpoints
                </Link>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  "Create Device & Generate QR Code"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
