'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { formatMonthLabel, getCurrentMonth } from '@/lib/period'
import { cn } from '@/lib/utils'

export default function PeriodPicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Legge il mese corrente dall'URL o usa quello reale
  const currentMonth = searchParams.get('month') || getCurrentMonth()
  const todayMonth = getCurrentMonth()

  const updateMonth = (newMonth: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', newMonth)
    router.push(`?${params.toString()}`)
  }

  const handlePrev = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    updateMonth(prevMonth)
  }

  const handleNext = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const nextDate = new Date(year, month, 1)
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    updateMonth(nextMonth)
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {currentMonth !== todayMonth && (
        <button
          onClick={() => updateMonth(todayMonth)}
          className="px-2 sm:px-3 py-1.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-surface)] transition-all"
        >
          Oggi
        </button>
      )}
      
      <div className="flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-1 shadow-sm">
        <button
          onClick={handlePrev}
          className="p-1 sm:p-1.5 hover:bg-[var(--bg-surface)] rounded-xl transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
        >
          <ChevronLeft size={16} />
        </button>
        
        <div className="px-2 sm:px-4 flex items-center gap-1.5 sm:gap-2 min-w-[100px] sm:min-w-[140px] justify-center">
          <Calendar size={14} className="text-[var(--accent)] hidden sm:block" />
          <span className="text-[11px] sm:text-sm font-bold text-[var(--fg-primary)] whitespace-nowrap">
            {formatMonthLabel(currentMonth)}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="p-1 sm:p-1.5 hover:bg-[var(--bg-surface)] rounded-xl transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
