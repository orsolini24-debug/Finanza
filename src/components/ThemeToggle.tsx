'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Moon, Sun, MonitorSmartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

type BaseTheme = 'obsidian' | 'sapphire' | 'forest' | 'sunset' | 'cyberpunk' | 'ocean' | 'rosegold' | 'mono'
type Variant = 'dark' | 'light'

const LEGACY_MAP: Record<string, string> = {
  'dark': 'obsidian-dark',
  'light': 'obsidian-light',
  'midnight-neon': 'sapphire-dark',
  'zen-garden': 'forest-dark',
  'cyberpunk': 'cyberpunk-dark',
  'ocean-blue': 'ocean-dark',
  'aurora-dark': 'sapphire-dark',
  'cloud-light': 'obsidian-light',
  'evergreen': 'forest-dark',
}

interface BaseThemeDef {
  id: BaseTheme
  label: string
  color: string
}

const BASE_THEMES: BaseThemeDef[] = [
  { id: 'obsidian',  label: 'Obsidian',  color: '#1DB9A6' },
  { id: 'sapphire',  label: 'Sapphire',  color: '#3B8BF5' },
  { id: 'forest',    label: 'Emerald',   color: '#7BA05B' },
  { id: 'sunset',    label: 'Sunset',    color: '#F97316' },
  { id: 'cyberpunk', label: 'Neon',      color: '#F032E6' },
  { id: 'ocean',     label: 'Ocean',     color: '#00BCD4' },
  { id: 'rosegold',  label: 'Luxury',    color: '#E879A0' },
  { id: 'mono',      label: 'Mono',      color: '#ADADAD' },
]

export default function ThemeToggle() {
  const [baseTheme, setBaseTheme] = useState<BaseTheme>('obsidian')
  const [variant, setVariant]     = useState<Variant>('dark')
  const [isAuto, setIsAuto]       = useState(false)
  
  const [open, setOpen]       = useState(false)
  const [pos, setPos]         = useState({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem('theme') ?? 'obsidian-dark'
    const resolved = LEGACY_MAP[raw] ?? raw
    
    if (resolved === 'auto') {
      setIsAuto(true)
      document.documentElement.setAttribute('data-theme', 'auto')
    } else {
      const [b, v] = resolved.split('-') as [BaseTheme, Variant]
      if (BASE_THEMES.find(t => t.id === b)) {
        setBaseTheme(b)
        setVariant(v || 'dark')
        document.documentElement.setAttribute('data-theme', resolved)
      } else {
        document.documentElement.setAttribute('data-theme', 'obsidian-dark')
      }
    }
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

  const toggleVariant = (newVariant: Variant) => {
    setVariant(newVariant)
    if (!isAuto) {
      const id = `${baseTheme}-${newVariant}`
      document.documentElement.setAttribute('data-theme', id)
      localStorage.setItem('theme', id)
    } else {
      // Se era in auto e clicco esplicitamente dark/light, esco da auto
      setIsAuto(false)
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
        className="fixed z-[9999] w-64 rounded-[2.5rem] shadow-2xl overflow-hidden glass p-5 animate-in fade-in zoom-in-95 duration-200"
        style={{ top: pos.top, right: pos.right, background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-5 px-1">
          Stile Interfaccia
        </p>

        {/* Grid Temi Base */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {BASE_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id, variant, false)}
              className={cn(
                "group flex flex-col items-center gap-2 p-2 rounded-2xl transition-all",
                !isAuto && baseTheme === t.id ? "bg-[var(--accent-dim)] ring-1 ring-[var(--accent)]" : "hover:bg-[var(--bg-elevated)]"
              )}
            >
              <div 
                className="w-7 h-7 rounded-full border-2 border-white/10 shadow-inner" 
                style={{ backgroundColor: t.color }}
              />
              <span className="text-[8px] font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100">
                {t.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => toggleVariant('light')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest",
                !isAuto && variant === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--fg-muted)]"
              )}
            >
              <Sun size={14} strokeWidth={3} /> Chiaro
            </button>
            <button
              onClick={() => toggleVariant('dark')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest",
                !isAuto && variant === 'dark' ? "bg-black text-white border-black shadow-xl" : "bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--fg-muted)]"
              )}
            >
              <Moon size={14} strokeWidth={3} /> Scuro
            </button>
          </div>

          <button
            onClick={() => applyTheme(baseTheme, variant, true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest",
              isAuto ? "bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)] shadow-lg" : "bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--fg-muted)]"
            )}
          >
            <MonitorSmartphone size={14} strokeWidth={3} /> Auto Sistema
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-2 sm:px-4 sm:py-2.5 rounded-2xl border transition-all flex items-center gap-3 group hover:shadow-xl btn-squishy"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: open ? 'var(--accent)' : 'var(--border-default)',
        }}
      >
        <div className="relative">
          {isAuto ? <MonitorSmartphone size={18} /> : variant === 'light' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-blue-400" />}
          {!isAuto && (
            <div 
              className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-elevated)]"
              style={{ backgroundColor: BASE_THEMES.find(t => t.id === baseTheme)?.color }}
            />
          )}
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest hidden md:inline text-[var(--fg-primary)]">
          {currentLabel}
        </span>
      </button>

      {mounted && open && createPortal(dropdown, document.body)}
    </>
  )
}
