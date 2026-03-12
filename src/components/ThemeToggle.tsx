'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Moon, Sun, MonitorSmartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

type BaseTheme = 'obsidian' | 'sapphire' | 'aurora' | 'sunset' | 'forest' | 'rosegold' | 'cyberpunk' | 'cloud' | 'ocean' | 'mono'
type Variant = 'dark' | 'light'
type ThemeState = BaseTheme | 'auto'

// Compatibilità con vecchi ID salvati in localStorage
const LEGACY_MAP: Record<string, string> = {
  'dark': 'obsidian-dark',
  'light': 'cloud-light',
  'midnight-neon': 'sapphire-dark',
  'zen-garden': 'forest-dark',
  'cyberpunk': 'cyberpunk-dark',
  'ocean-blue': 'ocean-dark',
  'obsidian': 'obsidian-dark',
  'sapphire': 'sapphire-dark',
  'aurora': 'aurora-dark',
  'cloud': 'cloud-light',
  'evergreen': 'forest-dark',
}

interface BaseThemeDef {
  id: BaseTheme
  label: string
  color: string // Per il preview dot
}

const BASE_THEMES: BaseThemeDef[] = [
  { id: 'obsidian',  label: 'Obsidian',  color: '#1DB9A6' },
  { id: 'sapphire',  label: 'Sapphire',  color: '#3B8BF5' },
  { id: 'aurora',    label: 'Aurora',    color: '#2DD4BF' },
  { id: 'sunset',    label: 'Sunset',    color: '#F97316' },
  { id: 'forest',    label: 'Forest',    color: '#7BA05B' },
  { id: 'rosegold',  label: 'Rose Gold', color: '#E879A0' },
  { id: 'cyberpunk', label: 'Cyberpunk', color: '#F032E6' },
  { id: 'cloud',     label: 'Cloud',     color: '#1D4ED8' },
  { id: 'ocean',     label: 'Ocean',     color: '#00BCD4' },
  { id: 'mono',      label: 'Mono',      color: '#ADADAD' },
]

export default function ThemeToggle() {
  const [baseTheme, setBaseTheme] = useState<BaseTheme>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('theme') ?? 'obsidian-dark'
      const resolved = LEGACY_MAP[raw] ?? raw
      if (resolved === 'auto') return 'obsidian'
      return (resolved.split('-')[0] as BaseTheme) || 'obsidian'
    }
    return 'obsidian'
  })
  const [variant, setVariant] = useState<Variant>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('theme') ?? 'obsidian-dark'
      const resolved = LEGACY_MAP[raw] ?? raw
      if (resolved === 'auto') return 'dark'
      return (resolved.split('-')[1] as Variant) || 'dark'
    }
    return 'dark'
  })
  const [isAuto, setIsAuto] = useState(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('theme') ?? 'obsidian-dark'
      return (LEGACY_MAP[raw] ?? raw) === 'auto'
    }
    return false
  })
  
  const [open, setOpen]       = useState(false)
  const [pos, setPos]         = useState({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem('theme') ?? 'obsidian-dark'
    const resolved = LEGACY_MAP[raw] ?? raw
    document.documentElement.setAttribute('data-theme', resolved)
  }, [])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen(prev => !prev)
  }

  const applyTheme = (b: BaseTheme, v: Variant, auto: boolean) => {
    setIsAuto(auto)
    if (!auto) {
      setBaseTheme(b)
      setVariant(v)
      const id = `${b}-${v}`
      document.documentElement.setAttribute('data-theme', id)
      localStorage.setItem('theme', id)
    } else {
      document.documentElement.setAttribute('data-theme', 'auto')
      localStorage.setItem('theme', 'auto')
    }
  }

  const toggleVariant = () => {
    const newVariant = variant === 'dark' ? 'light' : 'dark'
    setVariant(newVariant)
    if (!isAuto) {
      const id = `${baseTheme}-${newVariant}`
      document.documentElement.setAttribute('data-theme', id)
      localStorage.setItem('theme', id)
    }
  }

  const currentLabel = isAuto ? 'Auto' : BASE_THEMES.find(t => t.id === baseTheme)?.label

  const dropdown = (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
      <div
        className="fixed z-[9999] w-64 rounded-[2rem] shadow-2xl overflow-hidden glass p-4"
        style={{ top: pos.top, right: pos.right, background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4 px-2">
          Tema Interfaccia
        </p>

        {/* Grid Temi */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {BASE_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id, variant, false)}
              className={cn(
                "group flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all",
                !isAuto && baseTheme === t.id ? "bg-[var(--accent-dim)]" : "hover:bg-[var(--bg-elevated)]"
              )}
              title={t.label}
            >
              <div 
                className="w-6 h-6 rounded-full border-2 transition-transform group-hover:scale-110" 
                style={{ 
                  backgroundColor: t.color,
                  borderColor: !isAuto && baseTheme === t.id ? 'var(--accent)' : 'transparent'
                }}
              />
              <span className="text-[8px] font-bold uppercase truncate w-full text-center opacity-60">
                {t.id.slice(0, 3)}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle Dark/Light */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => { if(isAuto) setIsAuto(false); toggleVariant(); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
              !isAuto && variant === 'light' ? "bg-white text-black border-white shadow-lg" : "bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--fg-muted)]"
            )}
          >
            <Sun size={14} /> Chiaro
          </button>
          <button
            onClick={() => { if(isAuto) setIsAuto(false); toggleVariant(); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
              !isAuto && variant === 'dark' ? "bg-black text-white border-black shadow-lg" : "bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--fg-muted)]"
            )}
          >
            <Moon size={14} /> Scuro
          </button>
        </div>

        {/* Auto Mode */}
        <button
          onClick={() => applyTheme(baseTheme, variant, true)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest mt-2",
            isAuto ? "bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)] shadow-lg" : "bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--fg-muted)]"
          )}
        >
          <MonitorSmartphone size={14} /> Auto (Sistema)
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-2 sm:px-3 sm:py-2 rounded-xl border transition-all flex items-center gap-2 group hover:shadow-lg"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: open ? 'var(--accent)' : 'var(--border-subtle)',
          color: open ? 'var(--accent)' : 'var(--fg-muted)',
        }}
      >
        <div className="relative">
          {isAuto ? <MonitorSmartphone size={16} /> : variant === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          {!isAuto && (
            <div 
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-[var(--bg-elevated)]"
              style={{ backgroundColor: BASE_THEMES.find(t => t.id === baseTheme)?.color }}
            />
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline group-hover:text-[var(--fg-primary)] transition-colors">
          {currentLabel}
        </span>
      </button>

      {mounted && open && createPortal(dropdown, document.body)}
    </>
  )
}
