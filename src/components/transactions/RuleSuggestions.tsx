'use client'

import { useState, useTransition } from 'react'
import { Sparkles, ChevronDown, X, Check, Loader2, Info } from 'lucide-react'
import { createRule } from '@/app/actions/rules'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Suggestion {
  pattern: string
  categoryId: string
  categoryName: string
  count: number
  exampleDesc: string
}

interface RuleSuggestionsProps {
  suggestions: Suggestion[]
}

export default function RuleSuggestions({ suggestions }: RuleSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hiddenPatterns, setHiddenPatterns] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const visibleSuggestions = suggestions.filter(s => !hiddenPatterns.includes(s.pattern))

  if (visibleSuggestions.length === 0) return null

  const handleCreateRule = (s: Suggestion) => {
    const formData = new FormData()
    formData.append('name', `Regola: ${s.pattern}`)
    formData.append('contains', s.pattern)
    formData.append('setCategoryId', s.categoryId)
    formData.append('priority', '100')

    startTransition(async () => {
      try {
        await createRule(formData)
        setHiddenPatterns(prev => [...prev, s.pattern])
        router.refresh()
      } catch (e) {
        alert('Errore creazione regola')
      }
    })
  }

  const ignore = (pattern: string) => {
    setHiddenPatterns(prev => [...prev, pattern])
  }

  return (
    <div className="glass overflow-hidden rounded-[2rem] border border-[var(--accent)]/30 bg-[var(--accent-dim)]/5 animate-in slide-in-from-top-4 duration-500 mb-8">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent)] rounded-xl text-[var(--accent-on)] shadow-[0_0_15px_var(--glow-accent)]">
            <Sparkles size={16} />
          </div>
          <span className="text-sm font-bold text-[var(--fg-primary)]">
            {visibleSuggestions.length} {visibleSuggestions.length === 1 ? 'regola suggerita' : 'regole suggerite'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-1.5 bg-[var(--bg-elevated)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all"
          >
            {isExpanded ? 'Chiudi' : 'Vedi suggerimenti'}
            <ChevronDown size={14} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 grid gap-3 animate-in fade-in duration-300">
          {visibleSuggestions.map((s) => (
            <div key={s.pattern} className="glass bg-[var(--bg-surface)]/50 p-4 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Info size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--fg-muted)] leading-relaxed">
                    Ho notato che <span className="text-[var(--fg-primary)] font-bold">"{s.pattern}"</span> viene sempre categorizzato in <span className="text-[var(--accent)] font-bold">{s.categoryName}</span> ({s.count} volte).
                  </p>
                  <p className="text-[10px] text-[var(--fg-subtle)] font-bold uppercase mt-1">Esempio: {s.exampleDesc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button 
                  onClick={() => handleCreateRule(s)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--accent-on)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Crea regola
                </button>
                <button 
                  onClick={() => ignore(s.pattern)}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-xl text-[var(--fg-subtle)] hover:text-[var(--expense)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
