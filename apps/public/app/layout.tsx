import type { Metadata } from "next";
import "./globals.css";
import { PublicProviders } from "./providers";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+Mono+TC:wght@400;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+Mono+TC:wght@400;700&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: `[data-hydration-error] { display: none !important; }` }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <PublicProviders>
          {children}
        </PublicProviders>
      </body>
    </html>
  );
}
