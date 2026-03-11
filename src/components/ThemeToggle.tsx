'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Palette, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'dark' | 'light' | 'midnight-neon' | 'zen-garden' | 'cyberpunk' | 'ocean-blue'

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'dark', label: 'Dark Default', color: 'bg-[#0a0a0f]' },
  { id: 'midnight-neon', label: 'Midnight Neon', color: 'bg-[#000000] border border-[#00f2ff]/50' },
  { id: 'zen-garden', label: 'Zen Garden', color: 'bg-[#f4f1ea] border border-[#5d6d4e]/50' },
  { id: 'cyberpunk', label: 'Cyberpunk 2026', color: 'bg-[#0d0221] border border-[#f0f000]/50' },
  { id: 'ocean-blue', label: 'Ocean Blue', color: 'bg-[#0f172a]' },
  { id: 'light', label: 'Light Mode', color: 'bg-white' },
]

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all flex items-center gap-2"
        title="Cambia tema"
      >
        <Palette size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Tema</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 p-2 rounded-2xl z-[101] shadow-2xl border border-[var(--border-default)] animate-in slide-in-from-top-2 duration-200" style={{ background: 'var(--bg-surface)' }}>
            <div className="grid grid-cols-1 gap-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTheme(t.id)}
                  className={cn(
                    "flex items-center justify-between w-full p-2 rounded-xl transition-all text-left",
                    theme === t.id ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "hover:bg-[var(--bg-elevated)] text-[var(--fg-muted)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 rounded-full border border-white/10", t.color)} />
                    <span className="text-[11px] font-bold">{t.label}</span>
                  </div>
                  {theme === t.id && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
