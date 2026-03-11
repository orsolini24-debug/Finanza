'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Palette, Check, Moon, Sun, MonitorSmartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'obsidian' | 'sapphire' | 'auto' | 'evergreen' | 'aurora' | 'cloud'

// Compatibilità con vecchi ID salvati in localStorage
const LEGACY_MAP: Record<string, Theme> = {
  dark: 'obsidian',
  'midnight-neon': 'sapphire',
  'zen-garden': 'evergreen',
  cyberpunk: 'aurora',
  'ocean-blue': 'obsidian',
  light: 'cloud',
}

interface ThemeDef {
  id: Theme
  label: string
  desc: string
  preview: React.ReactNode
  icon?: React.ReactNode
}

const THEMES: ThemeDef[] = [
  {
    id: 'obsidian',
    label: 'Obsidian',
    desc: 'Nero OLED · Teal',
    preview: (
      <div className="w-5 h-5 rounded-full bg-[#0D1117] border border-[#1DB9A6]/40 shadow-[0_0_6px_rgba(29,185,166,0.4)]" />
    ),
  },
  {
    id: 'sapphire',
    label: 'Midnight Sapphire',
    desc: 'Navy · Electric Blue',
    preview: (
      <div className="w-5 h-5 rounded-full bg-[#070D1A] border border-[#3B8BF5]/40 shadow-[0_0_6px_rgba(59,139,245,0.4)]" />
    ),
  },
  {
    id: 'auto',
    label: 'Auto',
    desc: 'Segue il sistema',
    icon: <MonitorSmartphone size={14} />,
    preview: (
      <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 flex">
        <div className="w-1/2 bg-[#F7F5F2]" />
        <div className="w-1/2 bg-[#0D1117]" />
      </div>
    ),
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    desc: 'Foresta · Terra',
    preview: (
      <div className="w-5 h-5 rounded-full bg-[#111810] border border-[#7BA05B]/40 shadow-[0_0_6px_rgba(123,160,91,0.35)]" />
    ),
  },
  {
    id: 'aurora',
    label: 'Aurora',
    desc: 'Borealis · Gradient',
    preview: (
      <div
        className="w-5 h-5 rounded-full border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #2DD4BF 0%, #3B82F6 50%, #8B5CF6 100%)',
          boxShadow: '0 0 8px rgba(45,212,191,0.5)',
        }}
      />
    ),
  },
  {
    id: 'cloud',
    label: 'Cloud Dancer',
    desc: 'Pantone 2026 · Light',
    preview: (
      <div className="w-5 h-5 rounded-full bg-[#F7F5F2] border border-[#1D4ED8]/30 shadow-[0_0_6px_rgba(29,78,216,0.2)]" />
    ),
  },
]

export default function ThemeToggle() {
  const [theme, setTheme]     = useState<Theme>('obsidian')
  const [open, setOpen]       = useState(false)
  const [pos, setPos]         = useState({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem('theme') ?? ''
    const resolved = (LEGACY_MAP[raw] ?? raw) as Theme
    const valid = THEMES.find(t => t.id === resolved)
    const initial = valid ? resolved : 'obsidian'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen(prev => !prev)
  }

  const applyTheme = (id: Theme) => {
    setTheme(id)
    document.documentElement.setAttribute('data-theme', id)
    localStorage.setItem('theme', id)
    setOpen(false)
  }

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0]

  // Icona dinamica per il bottone: sole (cloud/auto-light), luna (dark), palette (altri)
  const ButtonIcon = () => {
    if (theme === 'cloud') return <Sun size={17} />
    if (theme === 'auto')  return <MonitorSmartphone size={17} />
    return <Palette size={17} />
  }

  const dropdown = (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
      <div
        className="fixed z-[9999] w-56 rounded-2xl shadow-2xl overflow-hidden"
        style={{ top: pos.top, right: pos.right, background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--fg-subtle)' }}>
            Tema Interfaccia
          </p>
        </div>

        {/* Lista temi */}
        <div className="p-1.5 grid grid-cols-1 gap-0.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={cn(
                "flex items-center gap-3 w-full px-2.5 py-2 rounded-xl transition-all text-left group",
                theme === t.id
                  ? "bg-[var(--accent-dim)]"
                  : "hover:bg-[var(--bg-elevated)]"
              )}
            >
              {/* Preview colore */}
              <div className="shrink-0">{t.preview}</div>

              {/* Testo */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] font-bold leading-tight truncate"
                  style={{ color: theme === t.id ? 'var(--accent)' : 'var(--fg-primary)' }}
                >
                  {t.label}
                </p>
                <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: 'var(--fg-subtle)' }}>
                  {t.desc}
                </p>
              </div>

              {/* Check attivo */}
              {theme === t.id && (
                <Check size={13} style={{ color: 'var(--accent)' }} className="shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Footer info Auto */}
        {theme === 'auto' && (
          <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <p className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
              Si adatta automaticamente alle preferenze di sistema (chiaro/scuro)
            </p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-2 rounded-xl border transition-all flex items-center gap-2"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: open ? 'var(--accent)' : 'var(--border-subtle)',
          color: open ? 'var(--accent)' : 'var(--fg-muted)',
        }}
        title="Cambia tema"
      >
        <ButtonIcon />
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
          {current.label}
        </span>
      </button>

      {mounted && open && createPortal(dropdown, document.body)}
    </>
  )
}
