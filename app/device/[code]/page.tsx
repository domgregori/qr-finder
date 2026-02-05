"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  MapPin, MessageCircle, Send, User, Clock, AlertCircle,
  CheckCircle, Smartphone, AlertTriangle
} from "lucide-react";
import { Turnstile } from "@/components/turnstile";

interface Message {
  id: string;
  nickname: string;
  message: string;
  isOwnerReply: boolean;
  createdAt: string;
}

interface DeviceData {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  uniqueCode: string;
  messages: Message[];
}

export default function PublicDevicePage() {
  const params = useParams();
  const code = params?.code as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Message form state
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const turnstileSiteKey = typeof window !== "undefined" 
    ? (window as any).__TURNSTILE_SITE_KEY ?? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
    : "";

  useEffect(() => {
    if (code) {
      fetchDevice();
    }
  }, [code]);

  // Real-time polling for new messages
  useEffect(() => {
    if (!device || notFound || error) return;
    
    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/public/device/${code}`);
        if (res.ok) {
          const data = await res.json();
          // Only update if there are new messages
          if (data.messages.length !== device.messages.length) {
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
  }, [device, code, notFound, error]);

  const fetchDevice = async () => {
    try {
      const res = await fetch(`/api/public/device/${code}`);
      if (res.ok) {
        const data = await res.json();
        setDevice(data);
      } else if (res.status === 404) {
        setNotFound(true);
      } else {
        setError("Failed to load device information");
      }
    } catch (err) {
      console.error("Failed to fetch device:", err);
      setError("Failed to load device information");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !message.trim()) {
      setFormError("Please enter your name and message");
      return;
    }

    setSending(true);
    setFormError("");

    try {
      const res = await fetch(`/api/public/device/${code}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          message: message.trim(),
          turnstileToken
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
        setMessage("");
        setSent(true);
        setTimeout(() => setSent(false), 3000);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
        }, 100);
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data?.error ?? "Failed to send message");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setFormError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading device information...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Device Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            This QR code doesn&apos;t match any registered device.
            The device may have been removed or the code is invalid.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <MapPin size={24} className="text-orange-500" />
            <span className="font-bold text-gray-900 dark:text-white">Lost & Found</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Notification Banner */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-green-800 dark:text-green-200 text-sm">
              <strong>The owner has been notified</strong> that someone scanned this code.
              You can leave a message below to help return this item.
            </p>
          </div>
        </div>

        {/* Device Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            {device?.photoUrl ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                <Image
                  src={device.photoUrl}
                  alt={device?.name ?? "Device"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Smartphone size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{device?.name ?? ""}</h1>
              {device?.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">{device.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Message Board */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle size={18} />
              Message Board
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Leave a message to help return this item to its owner
            </p>
          </div>

          {/* Messages */}
          <div className="max-h-80 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {(device?.messages?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Be the first to leave a message!</p>
              </div>
            ) : (
              (device?.messages ?? []).map((msg) => (
                <div
                  key={msg?.id}
                  className={`flex ${msg?.isOwnerReply ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs md:max-w-sm rounded-xl px-4 py-3 ${
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
                        {msg?.isOwnerReply ? "Owner" : msg?.nickname ?? ""}
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

          {/* Message Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            {sent && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg">
                <CheckCircle size={14} />
                Message sent successfully!
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Your Name</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Let the owner know you found their item..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>

            {turnstileSiteKey && (
              <Turnstile
                siteKey={turnstileSiteKey}
                onVerify={setTurnstileToken}
                onError={() => setFormError("Captcha failed. Please refresh and try again.")}
              />
            )}

            <button
              type="submit"
              disabled={sending || !nickname.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Send size={18} /> Send Message
                </>
              )}
            </button>
          </form>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          Your message and name will be visible to the device owner.
          Do not share sensitive personal information.
        </p>
      </main>
    </div>
  );
}
