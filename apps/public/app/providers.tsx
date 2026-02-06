"use client";

import { ThemeProvider } from "@shared/components/theme-provider";

export function PublicProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
