"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("clipforge_theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      // Default to light mode as requested
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("clipforge_theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return (
      <div className="size-8 rounded-full border border-border bg-muted/50" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
      className="flex size-8 items-center justify-center rounded-full border border-border bg-muted/70 text-foreground transition-all duration-200 hover:scale-105 hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
    >
      {theme === "light" ? (
        <Moon className="size-4 transition-transform duration-200" />
      ) : (
        <Sun className="size-4 text-amber-400 transition-transform duration-200" />
      )}
    </button>
  );
}
