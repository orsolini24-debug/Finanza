'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays, Check, ChevronDown } from 'lucide-react'
import { formatMonthLabel, getCurrentMonth, getQuarterLabel, getYearLabel, getPrevQuarterMonth, getNextQuarterMonth, getPrevYearMonth, getNextYearMonth, type PeriodMode } from '@/lib/period'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect, useTransition, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PeriodPicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [showDays, setShowDays] = useState(false)
  const [showMonths, setShowMonths] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const currentMonth = searchParams.get('month') || getCurrentMonth()
  const currentDay = searchParams.get('day')
  const currentPeriod = (searchParams.get('period') as PeriodMode) || 'month'
  const todayMonth = getCurrentMonth()
  const todayDate = new Date()

  // Genera una lista di mesi per il selettore rapido (ultimo anno + prossimo)
  const monthOptions = useMemo(() => {
    const options = []
    const d = new Date()
    d.setMonth(d.getMonth() + 3) // Partiamo da 3 mesi nel futuro
    for (let i = 0; i < 18; i++) {
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      options.push({
        value: mStr,
        label: formatMonthLabel(mStr)
      })
      d.setMonth(d.getMonth() - 1)
    }
    return options
  }, [])

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    
    const query = params.toString()
    const newUrl = `${pathname}${query ? `?${query}` : ''}`
    
    startTransition(() => {
      router.push(newUrl)
    })
  }

  const updatePeriod = (newPeriod: PeriodMode) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newPeriod === 'month') params.delete('period')
    else params.set('period', newPeriod)
    params.delete('day')
    const query = params.toString()
    startTransition(() => { router.push(`${pathname}${query ? '?' + query : ''}`) })
  }

  const handlePrev = () => {
    try {
      if (currentPeriod === 'quarter') { updateParam('month', getPrevQuarterMonth(currentMonth)); if (currentDay) updateParam('day', null); return }
      if (currentPeriod === 'year')    { updateParam('month', getPrevYearMonth(currentMonth));    if (currentDay) updateParam('day', null); return }

      const [year, month] = currentMonth.split('-').map(Number)
      const prevDate = new Date(year, month - 2, 1)
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      updateParam('month', prevMonth)
      if (currentDay) updateParam('day', null)
    } catch (e) {
      updateParam('month', todayMonth)
    }
  }

  const handleNext = () => {
    try {
      if (currentPeriod === 'quarter') { updateParam('month', getNextQuarterMonth(currentMonth)); if (currentDay) updateParam('day', null); return }
      if (currentPeriod === 'year')    { updateParam('month', getNextYearMonth(currentMonth));    if (currentDay) updateParam('day', null); return }

      const [year, month] = currentMonth.split('-').map(Number)
      const nextDate = new Date(year, month, 1)
      const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
      updateParam('month', nextMonth)
      if (currentDay) updateParam('day', null)
    } catch (e) {
      updateParam('month', todayMonth)
    }
  }

  // Genera i giorni del mese corrente
  const [year, month] = currentMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  useEffect(() => {
    if (showDays && scrollRef.current && currentDay) {
      const el = document.getElementById(`day-${currentDay}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [showDays, currentDay])

  return (
    <div className="relative flex flex-col items-end gap-2">
      {/* Mode Selector */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl self-end">
        {(['month', 'quarter', 'year'] as PeriodMode[]).map(mode => (
          <button key={mode} onClick={() => updatePeriod(mode)}
            className={cn('px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
              currentPeriod === mode
                ? 'bg-[var(--accent)] text-[var(--accent-on)]'
                : 'text-[var(--fg-subtle)] hover:text-[var(--fg-primary)]'
            )}>
            {mode === 'month' ? 'Mese' : mode === 'quarter' ? 'Trim.' : 'Anno'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle Giorno (Solo in modalità mese) */}
        {currentPeriod === 'month' && (
          <button
            onClick={() => { setShowDays(!showDays); setShowMonths(false); }}
            className={cn(
              "p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm",
              showDays ? "bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)]" : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] border-[var(--border-default)]"
            )}
            title="Seleziona Giorno"
          >
            <CalendarDays size={18} />
          </button>
        )}

        {/* Selettore Periodo */}
        <div className={cn(
          "flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-1 shadow-sm h-11 transition-opacity",
          isPending ? "opacity-50" : "opacity-100"
        )}>
          <button
            onClick={handlePrev}
            className="p-1.5 hover:bg-[var(--bg-surface)] rounded-xl transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
          >
            <ChevronLeft size={18} />
          </button>
          
          <button 
            onClick={() => { if (currentPeriod === 'month') { setShowMonths(!showMonths); setShowDays(false); } }}
            className={cn(
              "px-4 flex items-center gap-2 min-w-[120px] justify-center transition-colors font-black uppercase tracking-tight text-[13px]",
              showMonths ? "text-[var(--accent)]" : "text-[var(--fg-primary)] hover:text-[var(--accent)]",
              currentPeriod !== 'month' && "cursor-default"
            )}
          >
            {currentPeriod === 'quarter' ? getQuarterLabel(currentMonth)
              : currentPeriod === 'year' ? getYearLabel(currentMonth)
              : formatMonthLabel(currentMonth)}
            {currentPeriod === 'month' && <ChevronDown size={12} className={cn("transition-transform", showMonths ? "rotate-180" : "")} />}
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 hover:bg-[var(--bg-surface)] rounded-xl transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {/* Dropdown MESI */}
        {showMonths && currentPeriod === 'month' && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-24 right-0 z-50 glass bg-[var(--bg-surface)] p-2 rounded-[2rem] border border-[var(--border-default)] shadow-2xl w-64 max-h-[400px] overflow-y-auto custom-scrollbar"
          >
            <div className="p-2 space-y-1">
              <button
                onClick={() => { updateParam('month', todayMonth); updateParam('day', null); setShowMonths(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--accent-dim)] text-[var(--accent)] font-black text-[11px] uppercase tracking-widest transition-all mb-2 border border-dashed border-[var(--accent)]/30"
              >
                Torna a Oggi
              </button>
              {monthOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { updateParam('month', opt.value); updateParam('day', null); setShowMonths(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-xs font-bold",
                    currentMonth === opt.value 
                      ? "bg-[var(--accent)] text-[var(--accent-on)] shadow-md" 
                      : "text-[var(--fg-primary)] hover:bg-[var(--bg-elevated)]"
                  )}
                >
                  <span>{opt.label}</span>
                  {currentMonth === opt.value && <Check size={14} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timeline GIORNI */}
        {showDays && currentPeriod === 'month' && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-24 right-0 z-50 glass bg-[var(--bg-surface)] p-4 rounded-[2rem] border border-[var(--border-default)] shadow-2xl w-[90vw] max-w-[400px]"
          >
            <div className="flex items-center justify-between mb-4 px-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Seleziona Giorno</span>
               <button onClick={() => { updateParam('day', null); setShowDays(false); }} className="text-[9px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest">Reset Giorno</button>
            </div>
            
            <div 
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar snap-x select-none"
            >
              {days.map((d) => {
                const isSelected = currentDay === String(d)
                const isToday = todayMonth === currentMonth && todayDate.getDate() === d
                return (
                  <button
                    key={d}
                    id={`day-${d}`}
                    onClick={() => { updateParam('day', isSelected ? null : String(d)); setShowDays(false); }}
                    className={cn(
                      "flex-shrink-0 w-12 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all snap-center border-2",
                      isSelected 
                        ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-on)] shadow-lg shadow-[var(--glow-accent)] scale-105" 
                        : isToday 
                          ? "bg-[var(--accent-dim)] border-[var(--accent)]/30 text-[var(--accent)]"
                          : "bg-[var(--bg-input)] border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    <span className="text-[10px] font-black uppercase opacity-60">
                      {new Date(year, month - 1, d).toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 2)}
                    </span>
                    <span className="text-lg font-black leading-none">{d}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
