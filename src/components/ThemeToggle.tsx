"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  if (!mounted) return <div className="p-2 w-8 h-8" />;

  return (
    <button
      onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-all duration-200 text-[var(--fg-muted)] hover:text-[var(--fg-primary)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-sm shadow-sm"
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun size={16} className="animate-in fade-in spin-in-90 duration-300" /> : <Moon size={16} className="animate-in fade-in spin-in-90 duration-300" />}
    </button>
  );
}
