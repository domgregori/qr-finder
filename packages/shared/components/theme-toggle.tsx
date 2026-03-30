"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800" aria-label="Theme mode">
        <Monitor size={20} className="text-gray-600" />
      </button>
    );
  }

  const currentTheme = theme === "system" || theme === "dark" || theme === "light" ? theme : "system";
  const nextTheme = currentTheme === "system" ? "dark" : currentTheme === "dark" ? "light" : "system";

  const icon =
    currentTheme === "dark" ? (
      <Moon size={20} className="text-blue-400" />
    ) : currentTheme === "light" ? (
      <Sun size={20} className="text-yellow-500" />
    ) : (
      <Monitor size={20} className="text-gray-600 dark:text-gray-300" />
    );

  const label =
    currentTheme === "dark"
      ? "Theme: dark (click for light)"
      : currentTheme === "light"
        ? "Theme: light (click for auto)"
        : "Theme: auto (click for dark)";

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
