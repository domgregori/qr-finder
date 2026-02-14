import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@shared/components/providers";
import { ThemeToggleFab } from "@shared/components/theme-toggle-fab";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
        <style dangerouslySetInnerHTML={{ __html: `[data-hydration-error] { display: none !important; }` }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>
          {children}
          <ThemeToggleFab />
        </Providers>
      </body>
    </html>
  );
}
