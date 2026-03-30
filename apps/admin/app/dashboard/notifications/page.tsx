"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell, ArrowLeft, Plus, Trash2, Edit2, Send, X, Check, AlertCircle, Info
} from "lucide-react";

interface AppriseEndpoint {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  const [endpoints, setEndpoints] = useState<AppriseEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEndpoints();
    }
  }, [status]);

  const fetchEndpoints = async () => {
    try {
      const res = await fetch("/api/apprise");
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data);
      }
    } catch (err) {
      console.error("Failed to fetch endpoints:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const endpoint = editingId ? `/api/apprise/${editingId}` : "/api/apprise";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });

      if (res.ok) {
        setSuccess(editingId ? "Endpoint updated!" : "Endpoint added!");
        resetForm();
        fetchEndpoints();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save endpoint");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (endpoint: AppriseEndpoint) => {
    setEditingId(endpoint.id);
    setName(endpoint.name);
    setUrl(endpoint.url);
    setShowForm(true);
    setError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notification endpoint?")) return;

    try {
      const res = await fetch(`/api/apprise/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEndpoints(endpoints.filter((e) => e.id !== id));
        setSuccess("Endpoint deleted!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Failed to delete endpoint");
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setError("");

    try {
      const res = await fetch(`/api/apprise/${id}`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Test notification sent!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Failed to send test");
      }
    } catch (err) {
      setError("Failed to send test notification");
    } finally {
      setTesting(null);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setUrl("");
    setError("");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Manage Apprise notification endpoints</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} /> Add Endpoint
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
            <Check size={18} /> {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-3">
            <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Apprise Notification Syntax</p>
              <p className="text-blue-700 dark:text-blue-400">Use Apprise URL syntax for notifications. Examples:</p>
              <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-400">
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">ntfy://topic</code> - ntfy.sh</li>
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">tgram://bottoken/ChatID</code> - Telegram</li>
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">discord://webhook_id/webhook_token</code> - Discord</li>
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">slack://token/channel</code> - Slack</li>
              </ul>
              <p className="mt-2">
                <a href="https://github.com/caronc/apprise/wiki" target="_blank" rel="noopener" className="underline">
                  View all supported services →
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {editingId ? "Edit Endpoint" : "Add New Endpoint"}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Phone, Discord Server"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apprise URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g., ntfy://my-topic or tgram://bot:token/chatid"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Check size={18} />
                  )}
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Endpoints List */}
        {endpoints.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 text-center">
            <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No notification endpoints configured</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Add an endpoint to receive notifications when your devices are found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white">{endpoint.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">{endpoint.url}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTest(endpoint.id)}
                    disabled={testing === endpoint.id}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Send test notification"
                  >
                    {testing === endpoint.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(endpoint)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(endpoint.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
