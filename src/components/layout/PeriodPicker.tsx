'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from 'lucide-react'
import { formatMonthLabel, getCurrentMonth } from '@/lib/period'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PeriodPicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showDays, setShowDays] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const currentMonth = searchParams.get('month') || getCurrentMonth()
  const currentDay = searchParams.get('day') // Nuovo parametro per il giorno
  const todayMonth = getCurrentMonth()
  const todayDate = new Date()

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`)
  }

  const handlePrev = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    updateParam('month', prevMonth)
    updateParam('day', null)
  }

  const handleNext = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const nextDate = new Date(year, month, 1)
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    updateParam('month', nextMonth)
    updateParam('day', null)
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowDays(!showDays)}
          className={cn(
            "p-2.5 rounded-xl border transition-all active:scale-95",
            showDays ? "bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)]" : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] border-[var(--border-default)]"
          )}
        >
          <CalendarDays size={18} />
        </button>

        <div className="flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-1 shadow-sm h-11">
          <button
            onClick={handlePrev}
            className="p-1.5 hover:bg-[var(--bg-surface)] rounded-xl transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
          >
            <ChevronLeft size={18} />
          </button>
          
          <button 
            onClick={() => { updateParam('month', todayMonth); updateParam('day', null); }}
            className="px-4 flex items-center gap-2 min-w-[120px] justify-center hover:text-[var(--accent)] transition-colors"
          >
            <span className="text-[13px] font-black uppercase tracking-tight">
              {formatMonthLabel(currentMonth)}
            </span>
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
        {showDays && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-14 right-0 z-50 glass bg-[var(--bg-surface)] p-4 rounded-[2rem] border border-[var(--border-default)] shadow-2xl w-[90vw] max-w-[400px]"
          >
            <div className="flex items-center justify-between mb-4 px-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Seleziona Giorno</span>
               <button onClick={() => updateParam('day', null)} className="text-[9px] font-bold text-[var(--accent)] hover:underline">Reset</button>
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
                    onClick={() => updateParam('day', isSelected ? null : String(d))}
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
