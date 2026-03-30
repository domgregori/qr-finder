"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowLeft, ExternalLink, Copy, Check, Globe, QrCode, Palette } from "lucide-react";
import { QRCodeGenerator, QrSettings } from "@shared/components/qr-code-generator";
import { ThemeToggle } from "@shared/components/theme-toggle";

interface Device {
  id: string;
  name: string;
  uniqueCode: string;
  qrSettings?: QrSettings | null;
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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


  const handleSettingsChange = useCallback((settings: QrSettings) => {
    if (!id) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/devices/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrSettings: settings })
        });
      } catch (error) {
        console.error("Failed to save QR settings:", error);
      }
    }, 600);
  }, [id]);

  // Use PUBLIC_PORTAL_URL if set, otherwise fall back to current origin
  const effectiveBaseUrl = publicPortalUrl || baseUrl;
  const deviceUrl = `${effectiveBaseUrl}/device/${device?.uniqueCode ?? ""}`;
  const previewUrl = `${deviceUrl}?preview=1`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
                <span className="font-bold text-gray-900 dark:text-white">QR Studio for {device?.name ?? ""}</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-orange-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Device QR Link</h2>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This is the URL encoded by the QR. Scanning always opens this address.
              </p>
              <div className="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200 break-all">
                {deviceUrl}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={copyUrl}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {copied ? <Check size={16} className="text-green-600 dark:text-green-400" /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <Link
                  href={deviceUrl}
                  target="_blank"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <ExternalLink size={16} /> Open
                </Link>
              </div>
              <div className="mt-2">
                <Link
                  href={previewUrl}
                  target="_blank"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                >
                  <Palette size={16} /> Preview Public Page (No Notify)
                </Link>
              </div>
            </div>

            {/* Public Portal Notice */}
            {isUsingPublicPortal && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                  <Globe size={18} />
                  <span className="text-sm font-medium">Using separate public portal</span>
                </div>
                <p className="mt-2 text-xs text-green-700 dark:text-green-400 break-all">{publicPortalUrl}</p>
              </div>
            )}
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
            {effectiveBaseUrl && (
              <QRCodeGenerator
                url={deviceUrl}
                deviceName={device?.name ?? "Device"}
                initialSettings={device?.qrSettings ?? null}
                onSettingsChange={handleSettingsChange}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
