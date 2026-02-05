"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowLeft, ExternalLink, Copy, Check, Globe } from "lucide-react";
import { QRCodeGenerator } from "@/components/qr-code-generator";

interface Device {
  id: string;
  name: string;
  uniqueCode: string;
}

export default function DeviceQRPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [publicPortalUrl, setPublicPortalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchConfig();
      if (id) {
        fetchDevice();
      }
    }
  }, [status, id]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setPublicPortalUrl(data.publicPortalUrl);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const fetchDevice = async () => {
    try {
      const res = await fetch(`/api/devices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDevice(data);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch device:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use PUBLIC_PORTAL_URL if set, otherwise fall back to current origin
  const effectiveBaseUrl = publicPortalUrl || baseUrl;
  const deviceUrl = `${effectiveBaseUrl}/device/${device?.uniqueCode ?? ""}`;
  const isUsingPublicPortal = !!publicPortalUrl && publicPortalUrl !== baseUrl;

  const copyUrl = async () => {
    try {
      await navigator.clipboard?.writeText?.(deviceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated" || !device) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/devices/${id}`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-2">
                <MapPin size={24} className="text-orange-500" />
                <span className="font-bold text-gray-900 dark:text-white">QR Code for {device?.name ?? ""}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8">
          {/* Public Portal Notice */}
          {isUsingPublicPortal && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                <Globe size={18} />
                <span className="text-sm font-medium">QR code points to separate public portal</span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1 ml-6">
                {publicPortalUrl}
              </p>
            </div>
          )}

          {/* URL Display */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Public URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 break-all">
                {deviceUrl}
              </div>
              <button
                onClick={copyUrl}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Copy URL"
              >
                {copied ? (
                  <Check size={18} className="text-green-600 dark:text-green-400" />
                ) : (
                  <Copy size={18} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <Link
                href={deviceUrl}
                target="_blank"
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={18} className="text-gray-600 dark:text-gray-400" />
              </Link>
            </div>
          </div>

          {/* QR Code Generator */}
          {effectiveBaseUrl && (
            <QRCodeGenerator
              url={deviceUrl}
              deviceName={device?.name ?? "Device"}
            />
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">How to use</h3>
          <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>1. Customize the QR code appearance using the options above</li>
            <li>2. Download as PNG for easy printing on stickers or labels</li>
            <li>3. Attach the QR code to your device</li>
            <li>4. When someone scans it, you&apos;ll be notified and they can leave a message</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
