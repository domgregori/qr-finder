"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  MapPin, MessageCircle, Send, User, Clock, AlertCircle,
  CheckCircle, Smartphone, AlertTriangle
} from "lucide-react";
import { ThemeToggle } from "@shared/components/theme-toggle";

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
  profileBlurb?: string | null;
  profileAvatarUrl?: string | null;
  includeBio?: boolean | null;
}

export default function PublicDevicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params?.code as string;
  const previewMode = searchParams?.get("preview") === "1";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Message form state
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  const copyByLang = {
    en: {
      header: "Lost & Found",
      loading: "Loading device information...",
      deviceNotFound: "Device Not Found",
      deviceNotFoundBody:
        "This QR code doesn't match any registered device. The device may have been removed or the code is invalid.",
      errorTitle: "Something went wrong",
      messageBoard: "Message Board",
      messageBoardHelp: "Leave a message to help return this item to its owner",
      noMessages: "No messages yet. Be the first to leave a message!",
      owner: "Owner",
      ownerLabel: "You (Owner)",
      yourName: "Your Name",
      yourNamePlaceholder: "Enter your name",
      messageLabel: "Message",
      messagePlaceholder: "Let the owner know you found their item...",
      send: "Send Message",
      sending: "Sending...",
      messageSent: "Message sent successfully!",
      formError: "Please enter your name and message",
      aboutOwner: "About the owner",
      privacy:
        ""
    },
    es: {
      header: "Objetos Perdidos",
      loading: "Cargando información del dispositivo...",
      deviceNotFound: "Dispositivo No Encontrado",
      deviceNotFoundBody:
        "Este código QR no coincide con ningún dispositivo registrado. Es posible que el dispositivo haya sido eliminado o el código no sea válido.",
      errorTitle: "Algo salió mal",
      messageBoard: "Mensajes",
      messageBoardHelp: "Deja un mensaje para ayudar a devolver este objeto a su dueño",
      noMessages: "Aún no hay mensajes. ¡Sé el primero en dejar uno!",
      owner: "Propietario",
      ownerLabel: "Tú (Propietario)",
      yourName: "Tu Nombre",
      yourNamePlaceholder: "Escribe tu nombre",
      messageLabel: "Mensaje",
      messagePlaceholder: "Avísale al dueño que encontraste su objeto...",
      send: "Enviar Mensaje",
      sending: "Enviando...",
      messageSent: "¡Mensaje enviado!",
      formError: "Por favor ingresa tu nombre y mensaje",
      aboutOwner: "Sobre el propietario",
      privacy:
        ""
    }
  } as const;

  const t = copyByLang[language];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("public_lang");
    if (stored === "en" || stored === "es") {
      setLanguage(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("public_lang", language);
  }, [language]);

  useEffect(() => {
    if (code) {
      fetchDevice();
    }
  }, [code]);

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

  // Real-time polling for new messages
  useEffect(() => {
    if (!device || notFound || error) return;
    
    const pollMessages = async () => {
      try {
        const suffix = previewMode ? "?preview=1" : "";
        const res = await fetch(`/api/public/device/${code}${suffix}`);
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
  }, [device, code, notFound, error, previewMode]);

  const fetchDevice = async () => {
    try {
      const suffix = previewMode ? "?preview=1" : "";
      const res = await fetch(`/api/public/device/${code}${suffix}`);
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
      setFormError(t.formError);
      return;
    }

    setSending(true);
    setFormError("");

    try {
      const suffix = previewMode ? "?preview=1" : "";
      const res = await fetch(`/api/public/device/${code}/message${suffix}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          message: message.trim()
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
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.deviceNotFound}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.deviceNotFoundBody}</p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.errorTitle}</h1>
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MapPin size={24} className="text-orange-500" />
              <span className="font-bold text-gray-900 dark:text-white">{t.header}</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  language === "en"
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
                    : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("es")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  language === "es"
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
                    : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
                }`}
              >
                ES
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {previewMode && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Preview mode: scan analytics and notifications are disabled.
          </div>
        )}
        {/* Message Board */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle size={18} />
              {t.messageBoard}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t.messageBoardHelp}
            </p>
          </div>

          {/* Messages */}
          <div className="max-h-80 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {(device?.messages?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t.noMessages}</p>
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
                        {msg?.isOwnerReply ? t.owner : msg?.nickname ?? ""}
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
                {t.messageSent}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t.yourName}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t.yourNamePlaceholder}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t.messageLabel}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending || !nickname.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {sending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>{t.sending}</span>
                </div>
              ) : (
                <>
                  <Send size={18} /> {t.send}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Device Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mt-6">
          <div className="flex items-start gap-4">
            {device?.photoUrl ? (
              <div className="group relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveImageUrl(device.photoUrl ?? null)}
                  className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <Image
                    src={device.photoUrl}
                    alt={device?.name ?? "Device"}
                    fill
                    className="object-cover"
                  />
                </button>
                <div className="pointer-events-none absolute left-0 top-24 z-20 hidden w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800 md:block md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                  <img
                    src={device.photoUrl}
                    alt={`${device?.name ?? "Device"} preview`}
                    className="h-32 w-full rounded-md object-cover"
                  />
                </div>
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

        {(device?.includeBio && (device?.profileBlurb || device?.profileAvatarUrl)) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mt-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">{t.aboutOwner}</p>
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              {device?.profileAvatarUrl && (
                <div className="md:w-3/5 w-full order-1">
                  <div className="w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={device.profileAvatarUrl}
                      alt="Owner artwork"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}
              {device?.profileBlurb && (
                <div className="md:w-2/5 w-full order-2 md:order-none mt-3 md:mt-0">
                  <p className="bio-font text-gray-700 dark:text-gray-200 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                    {device.profileBlurb}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          {t.privacy}
        </p>
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
            alt={`${device?.name ?? "Device"} full view`}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
