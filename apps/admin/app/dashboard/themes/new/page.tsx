"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { QRCodeGenerator } from "@shared/components/qr-code-generator";
import { ThemeToggle } from "@shared/components/theme-toggle";

export default function NewThemePage() {
  const { status } = useSession() || {};
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("");

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

  const previewUrl = baseUrl ? `${baseUrl}/device/example` : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/account"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-2">
                <MapPin size={24} className="text-orange-500" />
                <span className="font-bold text-gray-900 dark:text-white">Create Custom Theme</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8">
          {previewUrl && (
            <QRCodeGenerator url={previewUrl} deviceName="Sample Device" />
          )}
        </div>
      </main>
    </div>
  );
}
