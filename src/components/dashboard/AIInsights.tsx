'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, X, ArrowRight, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

  const fetchInsights = async () => {
    const cacheKey = `ai-insights-${workspaceId}-${month}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        const isExpired = Date.now() - timestamp > 30 * 60 * 1000 // 30 minuti
        if (!isExpired && data?.length > 0) {
          setInsights(data)
          setLoading(false)
          setError(null)
          return
        }
      } catch {
        sessionStorage.removeItem(cacheKey)
      }
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
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: data.insights, timestamp: Date.now() }))
      } else {
        setError('Nessun insight ricevuto dal modello AI.')
      }
    } catch (e: any) {
      console.error('AI error', e)
      setError('Impossibile connettersi a Groq. Verifica la configurazione.')
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
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest hidden sm:block">
            Powered by Groq · Llama 3.3
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem(`ai-insights-${workspaceId}-${month}`)
              fetchInsights()
            }}
            disabled={loading}
            title="Aggiorna analisi"
            className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
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
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedInsight(insight)}
              className={cn(
                "glass p-5 sm:p-6 rounded-[2rem] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col h-full",
                insight.type === 'positive' && "hover:shadow-[0_0_20px_var(--income-dim)]",
                insight.type === 'warning' && "hover:shadow-[0_0_20px_var(--warning-dim)]",
                insight.type === 'tip' && "hover:shadow-[0_0_20px_var(--accent-dim)]"
              )}
            >
              <div className="text-3xl mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">{insight.icon}</div>
              <h4 className="text-[13px] font-bold text-[var(--fg-primary)] mb-2 leading-tight group-hover:text-[var(--accent)] transition-colors">{insight.title}</h4>
              <p className="text-[11px] text-[var(--fg-muted)] font-medium leading-relaxed line-clamp-2 mb-4 flex-1">
                {insight.message}
              </p>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--accent)] transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                Analisi completa <ArrowRight size={10} />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal / Deep Dive */}
      <AnimatePresence>
        {selectedInsight && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInsight(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl glass bg-[var(--bg-surface)] rounded-t-[2.5rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
            >
              {/* Handle mobile */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 -mb-2">
                <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
              </div>

              <div className="overflow-y-auto custom-scrollbar p-6 sm:p-10 lg:p-12">
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="absolute top-6 right-6 p-3 rounded-2xl hover:bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all z-10"
                >
                  <X size={20} />
                </button>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 mt-4 sm:mt-0">
                  <div className="text-7xl sm:text-8xl drop-shadow-2xl">{selectedInsight.icon}</div>
                  <div className="space-y-3">
                    <div className={cn(
                       "inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em]",
                       selectedInsight.type === 'positive' && "bg-[var(--income-dim)] text-[var(--income)] border border-[var(--income)]/20",
                       selectedInsight.type === 'warning' && "bg-[var(--warning-dim)] text-[var(--warning)] border border-[var(--warning)]/20",
                       selectedInsight.type === 'tip' && "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/20",
                       selectedInsight.type === 'info' && "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                     )}>
                       {selectedInsight.type} Insight
                     </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-[var(--fg-primary)] leading-tight tracking-tighter">
                      {selectedInsight.title}
                    </h3>
                  </div>
                </div>

                <div className="space-y-6 text-base sm:text-lg text-[var(--fg-muted)] font-medium leading-relaxed">
                  {selectedInsight.message.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                <div className="mt-10 pt-10 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4 p-5 rounded-3xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                    <div className="p-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-on)] shadow-lg">
                      <Lightbulb size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[var(--fg-primary)] uppercase tracking-wider mb-1">Suggerimento Strategico</p>
                      <p className="text-[12px] text-[var(--fg-muted)] leading-normal">Questa analisi è stata generata incrociando i tuoi flussi di cassa storici con le ricorrenze imminenti.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-5 rounded-3xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                    <div className="p-2.5 rounded-xl bg-[var(--info)] text-white shadow-lg">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[var(--fg-primary)] uppercase tracking-wider mb-1">Impatto Previsto</p>
                      <p className="text-[12px] text-[var(--fg-muted)] leading-normal">Seguire questi consigli potrebbe migliorare il tuo tasso di risparmio del 5-10% nel prossimo trimestre.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex justify-center">
                  <button 
                    onClick={() => setSelectedInsight(null)}
                    className="px-8 py-4 bg-[var(--fg-primary)] text-[var(--bg-base)] font-bold rounded-2xl hover:scale-105 transition-all shadow-xl"
                  >
                    Ho capito, grazie
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
