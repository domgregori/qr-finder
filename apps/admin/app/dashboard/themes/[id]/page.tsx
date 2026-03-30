"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { toast, Toaster } from "sonner";
import { QRCodeGenerator, type QrSettings } from "@shared/components/qr-code-generator";
import { ThemeToggle } from "@shared/components/theme-toggle";

type ThemePayload = {
  id: string;
  name: string;
  settings: QrSettings;
};

export default function EditThemePage() {
  const { status } = useSession() || {};
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [baseUrl, setBaseUrl] = useState("");
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [themeName, setThemeName] = useState("");
  const [themeSettings, setThemeSettings] = useState<QrSettings | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);

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
    const loadTheme = async () => {
      if (!params?.id || status !== "authenticated") return;
      setLoadingTheme(true);
      try {
        const res = await fetch(`/api/qr-themes/${params.id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error ?? "Failed to load theme");
          router.replace("/dashboard/account");
          return;
        }

        const data = (await res.json()) as ThemePayload;
        setThemeName(data.name ?? "");
        setThemeSettings(data.settings ?? null);
      } catch (error) {
        console.error("Load theme error:", error);
        toast.error("Failed to load theme");
        router.replace("/dashboard/account");
      } finally {
        setLoadingTheme(false);
      }
    };

    void loadTheme();
  }, [params?.id, router, status]);

  const saveTheme = async () => {
    const name = themeName.trim();
    if (!name) {
      toast.error("Theme name is required");
      return;
    }
    if (!themeSettings) {
      toast.error("Theme settings are missing");
      return;
    }

    setSavingTheme(true);
    try {
      const res = await fetch(`/api/qr-themes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          settings: themeSettings,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Failed to update theme");
        return;
      }

      toast.success("Theme updated");
      router.push("/dashboard/account");
    } catch (error) {
      console.error("Save theme error:", error);
      toast.error("Failed to update theme");
    } finally {
      setSavingTheme(false);
    }
  };

  if (status === "loading" || loadingTheme) {
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
      <Toaster position="top-right" richColors />
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
                <span className="font-bold text-gray-900 dark:text-white">Edit Custom Theme</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme Name</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              placeholder="Theme name"
            />
            <button
              type="button"
              onClick={() => void saveTheme()}
              disabled={savingTheme || !themeSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {savingTheme ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8">
          {previewUrl && themeSettings && (
            <QRCodeGenerator
              url={previewUrl}
              deviceName="Sample Device"
              initialSettings={themeSettings}
              onSettingsChange={setThemeSettings}
              showThemeSave={false}
            />
          )}
        </div>
      </main>
    </div>
  );
}
