"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, LogOut } from "lucide-react";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import { ThemeToggle } from "@shared/components/theme-toggle";

interface Theme {
  id: string;
  name: string;
}

export default function AccountPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const loadThemes = async () => {
      setLoadingThemes(true);
      try {
        const res = await fetch("/api/qr-themes");
        if (res.ok) {
          const data = await res.json();
          setThemes(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load themes:", error);
      } finally {
        setLoadingThemes(false);
      }
    };
    if (status === "authenticated") {
      loadThemes();
      loadAccount();
    }
  }, [status]);

  const loadAccount = async () => {
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        setBio(data?.bio ?? "");
        setAvatarUrl(data?.avatarUrl ?? null);
        setAvatarDisplayUrl(data?.avatarDisplayUrl ?? null);
      }
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  };

  const deleteTheme = async (id: string) => {
    try {
      const res = await fetch(`/api/qr-themes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setThemes((prev) => prev.filter((t) => t.id !== id));
        toast.success("Theme deleted.");
      } else {
        toast.error("Failed to delete theme.");
      }
    } catch (error) {
      console.error("Delete theme error:", error);
      toast.error("Failed to delete theme.");
    }
  };

  const saveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBio(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio })
      });
      if (res.ok) {
        toast.success("Profile blurb updated.");
      } else {
        toast.error("Failed to update blurb.");
      }
    } catch (error) {
      console.error("Save bio error:", error);
      toast.error("Failed to update blurb.");
    } finally {
      setSavingBio(false);
    }
  };

  const saveAvatarMeta = async (nextAvatarUrl: string | null) => {
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: nextAvatarUrl })
    });
    if (!res.ok) {
      throw new Error("Failed to save avatar settings");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true
        })
      });

      if (!presignedRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, cloud_storage_path, useLocalUpload } = await presignedRes.json();

      let nextUrl = "";
      if (useLocalUpload) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload/local", {
          method: "POST",
          body: formData
        });
        if (!uploadRes.ok) throw new Error("Failed to upload file");
        const { cloud_storage_path: localPath } = await uploadRes.json();
        nextUrl = localPath;
      } else {
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
        nextUrl = cloud_storage_path;
      }

      await saveAvatarMeta(nextUrl);
      await loadAccount();
      toast.success("Avatar updated.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeAvatar: true })
      });
      if (res.ok) {
        setAvatarUrl(null);
        setAvatarDisplayUrl(null);
        toast.success("Avatar removed.");
      } else {
        toast.error("Failed to remove avatar.");
      }
    } catch (error) {
      console.error("Remove avatar error:", error);
      toast.error("Failed to remove avatar.");
    }
  };


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please enter your current and new password.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Failed to change password.");
        return;
      }

      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Change password error:", error);
      toast.error("Failed to change password.");
    } finally {
      setChangingPassword(false);
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
      <Toaster position="top-right" richColors />
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

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="New password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm password"
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {changingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About You</h2>
          <div className="grid md:grid-cols-[140px_1fr] gap-6 items-start">
            <div className="space-y-3">
              <div className="relative h-28 w-28 overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-xl">
                {avatarDisplayUrl ? (
                  <Image src={avatarDisplayUrl} alt="Avatar" fill className="object-contain" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                  <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    {uploadingAvatar ? "Uploading..." : "Upload Image"}
                  </span>
                </label>
                {avatarDisplayUrl && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
            <form onSubmit={saveBio} className="space-y-3">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Short blurb shown next to your QR code"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{bio.length}/1000</span>
                <button
                  type="submit"
                  disabled={savingBio}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingBio ? "Saving..." : "Save Blurb"}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Preview</p>
            <div className="flex gap-3 items-start">
              {avatarDisplayUrl && (
                <div className="h-12 w-12 overflow-hidden bg-white dark:bg-gray-800 rounded-xl">
                  <Image src={avatarDisplayUrl} alt="Avatar preview" width={48} height={48} className="object-contain" />
                </div>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{bio || "Your blurb will appear here."}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Themes</h2>
            <Link
              href="/dashboard/themes/new"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Add Custom Theme
            </Link>
          </div>
          {loadingThemes ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading themes...</p>
          ) : themes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No custom themes yet.</p>
          ) : (
            <div className="space-y-2">
              {themes.map((theme) => (
                <div key={theme.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-800 dark:text-gray-200">{theme.name}</span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/themes/${theme.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteTheme(theme.id)}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
