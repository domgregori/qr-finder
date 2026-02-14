"use client";

import { ThemeToggle } from "@shared/components/theme-toggle";

export function ThemeToggleFab() {
  return (
    <div className="fixed top-4 right-4 z-50 rounded-xl bg-white/90 dark:bg-gray-900/90 shadow-lg ring-1 ring-gray-200/70 dark:ring-gray-700/70 p-1">
      <ThemeToggle />
    </div>
  );
}
