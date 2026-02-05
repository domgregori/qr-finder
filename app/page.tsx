import Link from "next/link";
import { MapPin, QrCode, Bell, MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <MapPin size={48} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Lost & Found Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              QR codes for your devices. Get notified when found.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Admin Dashboard
          </Link>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <QrCode size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">QR Codes</p>
            </div>
            <div className="text-center">
              <Bell size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Notifications</p>
            </div>
            <div className="text-center">
              <MessageCircle size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Messaging</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-gray-400 dark:text-gray-500 text-sm">
        Self-hosted device tracking
      </footer>
    </div>
  );
}
