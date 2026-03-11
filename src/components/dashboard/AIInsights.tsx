'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ArrowRight, Lightbulb, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Insight {
  type: 'positive' | 'warning' | 'tip' | 'info'
  icon: string
  title: string
  message: string
}

interface AIInsightsProps {
  workspaceId: string
  month: string
}

export default function AIInsights({ workspaceId, month }: AIInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    const cacheKey = `ai-insights-${workspaceId}-${month}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      setInsights(JSON.parse(cached))
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, month })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.insights && data.insights.length > 0) {
        setInsights(data.insights)
        sessionStorage.setItem(cacheKey, JSON.stringify(data.insights))
      } else {
        setError('Nessun insight ricevuto dal modello AI.')
      }
    } catch (e: any) {
      console.error('AI error', e)
      setError('Impossibile connettersi a Groq. Verifica che GROQ_API_KEY sia configurata nelle variabili d\'ambiente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInsights() }, [workspaceId, month])

  if (!loading && error) {
    return (
      <div className="glass p-5 rounded-[2rem] border border-[var(--warning)]/20 bg-[var(--warning-dim)]/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="text-[var(--warning)] shrink-0" size={18} />
          <p className="text-xs text-[var(--fg-muted)] font-medium">{error}</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(`ai-insights-${workspaceId}-${month}`); fetchInsights() }}
          className="text-[10px] font-bold text-[var(--accent)] hover:underline shrink-0"
        >
          Riprova
        </button>
      </div>
    )
  }

  if (!loading && insights.length === 0) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[var(--accent)]" size={20} />
          <h2 className="text-xl font-display font-bold text-[var(--fg-primary)]">Analisi del periodo</h2>
        </div>
        <div className="px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest">
          Powered by Groq · Llama 3.3
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass p-6 rounded-[2rem] border border-[var(--border-subtle)] animate-pulse">
              <div className="w-10 h-10 bg-[var(--bg-elevated)] rounded-xl mb-4" />
              <div className="h-4 bg-[var(--bg-elevated)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-full" />
            </div>
          ))
        ) : (
          insights.map((insight, idx) => (
            <div 
              key={idx} 
              className={cn(
                "glass p-6 rounded-[2rem] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-500 animate-in fade-in slide-in-from-bottom-2",
                insight.type === 'positive' && "border-[var(--income)]/20 bg-[var(--income-dim)]/5",
                insight.type === 'warning' && "border-[var(--warning)]/20 bg-[var(--warning-dim)]/5",
                insight.type === 'tip' && "border-[var(--accent)]/20 bg-[var(--accent-dim)]/5",
                insight.type === 'info' && "border-blue-500/20 bg-blue-500/5"
              )}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className="text-3xl mb-4 drop-shadow-sm">{insight.icon}</div>
              <h4 className="text-sm font-bold text-[var(--fg-primary)] mb-1 leading-tight">{insight.title}</h4>
              <p className="text-[11px] text-[var(--fg-muted)] font-medium leading-relaxed line-clamp-2">
                {insight.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
