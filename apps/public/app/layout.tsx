import type { Metadata } from "next";
import "./globals.css";
import { PublicProviders } from "./providers";
import { ThemeToggle } from "@shared/components/theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lost & Found Tracker",
  description: "Track your devices with QR codes and get notified when found",
  metadataBase: new URL(process.env.PUBLIC_PORTAL_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg"
  },
  openGraph: {
    title: "Lost & Found Tracker",
    description: "Track your devices with QR codes and get notified when found",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
        <style dangerouslySetInnerHTML={{ __html: `[data-hydration-error] { display: none !important; }` }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <PublicProviders>
          <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-end">
              <ThemeToggle />
            </div>
          </div>
          {children}
        </PublicProviders>
      </body>
    </html>
  );
}
