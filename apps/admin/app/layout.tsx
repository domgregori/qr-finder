import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@shared/components/providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lost & Found Tracker",
  description: "Track your devices with QR codes and get notified when found",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
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
  const appVersion = process.env.APP_VERSION || "dev";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `[data-hydration-error] { display: none !important; }` }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>
          {children}
          <div className="pointer-events-none fixed bottom-2 right-3 z-[100] text-[11px] text-gray-400 dark:text-gray-500">
            {appVersion}
          </div>
        </Providers>
      </body>
    </html>
  );
}
