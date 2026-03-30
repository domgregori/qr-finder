"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import {
  MapPin, Plus, Smartphone, MessageCircle, QrCode, Settings,
  Trash2, LogOut, ExternalLink, Search, AlertCircle, Bell, Printer
} from "lucide-react";
import { ThemeToggle } from "@shared/components/theme-toggle";

interface Device {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  photoDisplayUrl?: string | null;
  uniqueCode: string;
  createdAt: string;
  newScanCount?: number;
  _count: { messages: number; scans: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const prevMessageCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDevices();
    }
  }, [status]);

  useEffect(() => {
    if (!activeImageUrl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImageUrl(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageUrl]);

  // Polling for new messages across all devices
  useEffect(() => {
    if (status !== "authenticated" || loading) return;

    const pollDevices = async () => {
      try {
        const res = await fetch("/api/devices");
        if (res.ok) {
          const data: Device[] = await res.json();
          
          // Check for new messages
          data.forEach((device) => {
            const prevCount = prevMessageCountsRef.current[device.id] ?? 0;
            const newCount = device._count?.messages ?? 0;
            
            if (prevCount > 0 && newCount > prevCount) {
              const newMsgCount = newCount - prevCount;
              toast.info(`${newMsgCount} new message${newMsgCount > 1 ? "s" : ""} for ${device.name}`, {
                description: "Click to view messages",
                duration: 5000,
                icon: <Bell className="w-4 h-4" />,
                action: {
                  label: "View",
                  onClick: () => router.push(`/dashboard/devices/${device.id}`),
                },
              });
            }
            
            prevMessageCountsRef.current[device.id] = newCount;
          });
          
          setDevices(data ?? []);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Initialize message counts
    devices.forEach((device) => {
      if (prevMessageCountsRef.current[device.id] === undefined) {
        prevMessageCountsRef.current[device.id] = device._count?.messages ?? 0;
      }
    });

    const interval = setInterval(pollDevices, 5000);
    return () => clearInterval(interval);
  }, [status, loading, devices, router]);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data ?? []);
        // Initialize message counts
        (data ?? []).forEach((device: Device) => {
          prevMessageCountsRef.current[device.id] = device._count?.messages ?? 0;
        });
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDevices((prev) => (prev ?? []).filter((d) => d?.id !== id));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete device:", error);
    }
  };


  const filteredDevices = (devices ?? []).filter((device) =>
    device?.name?.toLowerCase()?.includes?.(searchTerm?.toLowerCase?.() ?? "") ??
    device?.description?.toLowerCase()?.includes?.(searchTerm?.toLowerCase?.() ?? "")
  );

  if (status === "loading" || (status === "authenticated" && loading)) {
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
      <Toaster position="top-right" richColors />
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <MapPin size={24} className="text-orange-500" />
              <span className="font-bold text-gray-900 dark:text-white">Lost & Found</span>
            </Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <details className="relative">
                <summary className="list-none cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  {session?.user?.email ?? ""}
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden z-50">
                  <Link
                    href="/dashboard/account"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Account Settings
                  </Link>
                  <Link
                    href="/dashboard/notifications"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Notifications
                  </Link>
                </div>
              </details>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Devices</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your tracked devices and QR codes</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/print"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              <Printer size={18} /> Print Sheet
            </Link>
            <Link
              href="/dashboard/devices/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={18} /> Add Device
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search devices..."
            className="w-full md:w-96 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Devices Grid */}
        {(filteredDevices?.length ?? 0) === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <Smartphone size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No devices yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first device to start tracking</p>
            <Link
              href="/dashboard/devices/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} /> Add Device
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(filteredDevices ?? []).map((device) => (
              <div
                key={device?.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {device?.photoDisplayUrl ? (
                        <div className="group relative">
                          <button
                            type="button"
                            onClick={() => setActiveImageUrl(device.photoDisplayUrl ?? null)}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <img
                              src={device.photoDisplayUrl}
                              alt={device?.name ?? "Device"}
                              className="w-full h-full object-cover"
                            />
                          </button>
                          <div className="pointer-events-none absolute left-0 top-11 z-20 hidden w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800 md:block md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                            <img src={device.photoDisplayUrl} alt={`${device?.name ?? "Device"} preview`} className="h-28 w-full rounded-md object-cover" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Smartphone size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{device?.name ?? ""}</h3>
                          <span
                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                              (device?.newScanCount ?? 0) > 0
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}
                            title={
                              (device?.newScanCount ?? 0) > 0
                                ? `${device?.newScanCount ?? 0} new scan(s)`
                                : "No new scans"
                            }
                          >
                            {device?._count?.scans ?? 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Code: {device?.uniqueCode ?? ""}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteId(device?.id ?? null)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {device?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {device.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <MessageCircle size={14} />
                    <span>{device?._count?.messages ?? 0} messages</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>{device?._count?.scans ?? 0} scans</span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/devices/${device?.id ?? ""}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      <Settings size={14} /> Manage
                    </Link>
                    <Link
                      href={`/dashboard/devices/${device?.id ?? ""}/qr`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium"
                    >
                      <QrCode size={14} /> QR Code
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {activeImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setActiveImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImageUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-white"
            aria-label="Close image preview"
          >
            Close
          </button>
          <img
            src={activeImageUrl}
            alt="Device full view"
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Device?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete the device and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
