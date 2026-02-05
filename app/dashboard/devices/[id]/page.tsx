"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import {
  MapPin, ArrowLeft, Smartphone, MessageCircle, QrCode,
  Send, User, Clock, AlertCircle, Save, Trash2, RotateCcw,
  RefreshCw, ShieldAlert, X, Bell
} from "lucide-react";

interface Message {
  id: string;
  nickname: string;
  message: string;
  isOwnerReply: boolean;
  createdAt: string;
}

interface Device {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  appriseUrl: string | null;
  uniqueCode: string;
  createdAt: string;
  messages: Message[];
}

export default function DeviceDetailPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAppriseUrl, setEditAppriseUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Regenerate code modal states
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [clearMessagesOnRegenerate, setClearMessagesOnRegenerate] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && id) {
      fetchDevice();
    }
  }, [status, id]);

  // Real-time polling for new messages
  useEffect(() => {
    if (status !== "authenticated" || !device || !id) return;
    
    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/devices/${id}`);
        if (res.ok) {
          const data = await res.json();
          // Only update if there are new messages
          if (data.messages.length > device.messages.length) {
            // Find new messages that aren't owner replies (finder messages)
            const newFinderMessages = data.messages.slice(device.messages.length).filter(
              (msg: Message) => !msg.isOwnerReply
            );
            
            // Show toast for each new finder message
            newFinderMessages.forEach((msg: Message) => {
              toast.info(`New message from ${msg.nickname}`, {
                description: msg.message.length > 50 ? msg.message.substring(0, 50) + "..." : msg.message,
                duration: 5000,
                icon: <Bell className="w-4 h-4" />,
              });
            });
            
            setDevice(data);
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [device, id, status]);

  const fetchDevice = async () => {
    try {
      const res = await fetch(`/api/devices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDevice(data);
        setEditName(data?.name ?? "");
        setEditDescription(data?.description ?? "");
        setEditAppriseUrl(data?.appriseUrl ?? "");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch device:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/devices/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: "Owner",
          message: replyText.trim()
        })
      });

      if (res.ok) {
        const newMessage = await res.json();
        setDevice((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...(prev?.messages ?? []), newMessage]
          };
        });
        setReplyText("");
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
      setError("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleClearMessages = async () => {
    if (!confirm("Clear all messages for this device? This cannot be undone.")) return;

    setClearing(true);
    setError("");

    try {
      const res = await fetch(`/api/devices/${id}/messages`, {
        method: "DELETE"
      });

      if (res.ok) {
        setDevice((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: [] };
        });
      } else {
        setError("Failed to clear messages");
      }
    } catch (err) {
      console.error("Failed to clear messages:", err);
      setError("Failed to clear messages");
    } finally {
      setClearing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setError("Device name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          appriseUrl: editAppriseUrl.trim() || null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setDevice((prev) => (prev ? { ...prev, ...updated } : prev));
        setEditMode(false);
      }
    } catch (err) {
      console.error("Failed to update device:", err);
      setError("Failed to update device");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/devices/${id}/regenerate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearMessages: clearMessagesOnRegenerate })
      });

      if (res.ok) {
        const data = await res.json();
        setDevice(data.device);
        setShowRegenerateModal(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to regenerate code");
      }
    } catch (err) {
      console.error("Failed to regenerate code:", err);
      setError("Failed to regenerate code");
    } finally {
      setRegenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
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
      <Toaster position="top-right" richColors />
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-2">
                <MapPin size={24} className="text-orange-500" />
                <span className="font-bold text-gray-900 dark:text-white">{device?.name ?? ""}</span>
              </div>
            </div>
            <Link
              href={`/dashboard/devices/${id}/qr`}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors font-medium"
            >
              <QrCode size={18} /> QR Code
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Device Info */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Device Info</h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {editMode ? "Cancel" : "Edit"}
                </button>
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mt-1 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Apprise URL</label>
                    <input
                      type="url"
                      value={editAppriseUrl}
                      onChange={(e) => setEditAppriseUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Smartphone size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{device?.name ?? ""}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Code: {device?.uniqueCode ?? ""}</p>
                    </div>
                  </div>

                  {device?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{device.description}</p>
                  )}

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Public URL:</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded block mt-1 break-all">
                      /device/{device?.uniqueCode ?? ""}
                    </code>
                  </div>

                  {/* Regenerate Code Button */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowRegenerateModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                    >
                      <RefreshCw size={14} />
                      Reset QR Code / URL
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Invalidates the old URL after device is found
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle size={18} />
                  Messages ({device?.messages?.length ?? 0})
                </h2>
                {(device?.messages?.length ?? 0) > 0 && (
                  <button
                    onClick={handleClearMessages}
                    disabled={clearing}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Clear all messages"
                  >
                    {clearing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 dark:border-red-400" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    Clear
                  </button>
                )}
              </div>

              {/* Messages List */}
              <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {(device?.messages?.length ?? 0) === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Messages will appear here when someone finds your device</p>
                  </div>
                ) : (
                  (device?.messages ?? []).map((msg) => (
                    <div
                      key={msg?.id}
                      className={`flex ${msg?.isOwnerReply ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md rounded-xl px-4 py-3 ${
                          msg?.isOwnerReply
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User size={12} />
                          <span className={`text-xs font-medium ${
                            msg?.isOwnerReply ? "text-blue-100" : "text-gray-600 dark:text-gray-400"
                          }`}>
                            {msg?.isOwnerReply ? "You (Owner)" : msg?.nickname ?? ""}
                          </span>
                        </div>
                        <p className="text-sm">{msg?.message ?? ""}</p>
                        <div className={`flex items-center gap-1 mt-2 text-xs ${
                          msg?.isOwnerReply ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
                        }`}>
                          <Clock size={10} />
                          {formatDate(msg?.createdAt ?? "")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {error && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg mb-3">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={16} /> Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Regenerate Code Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset QR Code</h3>
              </div>
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will generate a <strong>new unique code</strong> for this device. The old QR code and URL will <strong>stop working</strong> immediately.
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Use this when:</strong>
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 space-y-1 list-disc list-inside">
                  <li>Your device was found and returned</li>
                  <li>You want to revoke access for previous finders</li>
                  <li>You need to replace an old QR sticker</li>
                </ul>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearMessagesOnRegenerate}
                  onChange={(e) => setClearMessagesOnRegenerate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Also clear all messages (recommended)
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg mb-4">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateCode}
                disabled={regenerating}
                className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {regenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Generate New Code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
