'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, X, ArrowRight, ShieldCheck, Brain, TrendingUp, Zap, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import LottieAnimation from '@/components/ui/LottieAnimation'

interface AIInsight {
  type: 'positive' | 'warning' | 'tip' | 'info'
  icon: string
  title: string
  message: string
  detail?: string
  action?: string
}

interface AIResponse {
  rating: {
    score: number
    label: string
    breakdown: { liquidity: string; savings: string; lifestyle: string; strategy: string }
  }
  personality: {
    type: string
    description?: string
    migrationPath: string
    primaryBias: string
  }
  insights: AIInsight[]
}

const INSIGHT_TYPE_META = {
  positive: { color: 'var(--income)', dim: 'var(--income-dim)', label: 'Punto di forza' },
  warning:  { color: 'var(--expense)', dim: 'var(--expense-dim)', label: 'Attenzione' },
  tip:      { color: 'var(--accent)', dim: 'var(--accent-dim)', label: 'Consiglio' },
  info:     { color: 'var(--fg-muted)', dim: 'var(--border-subtle)', label: 'Info' },
}

const BREAKDOWN_LABELS: Record<string, string> = {
  liquidity: 'Liquidità',
  savings: 'Risparmio',
  lifestyle: 'Stile di vita',
  strategy: 'Strategia',
}

// ── Score arc SVG ────────────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const label = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  const color = score >= 80 ? 'var(--income)' : score >= 60 ? 'var(--accent)' : score >= 40 ? 'var(--warning)' : 'var(--expense)'

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="transparent" stroke="var(--border-subtle)" strokeWidth="7" />
        <motion.circle
          cx="50" cy="50" r={r} fill="transparent"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(score / 100) * circ} ${circ}` }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-5xl font-display font-black leading-none"
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest mt-0.5">
          Rating {label}
        </span>
      </div>
    </div>
  )
}

export default function AIInsights({ workspaceId, month }: { workspaceId: string; month: string }) {
  const [data, setData] = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [error, setError] = useState(false)

  const cacheKey = `ai-insights-${workspaceId}-${month}`

  const fetchInsights = async (force = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const { data: d, ts } = JSON.parse(cached)
          if (Date.now() - ts < 30 * 60 * 1000) {
            setData(d)
            setLoading(false)
            return
          }
        } catch {}
      }
    }
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, month, force })
      })
      if (!res.ok) throw new Error('fetch failed')
      const result = await res.json()
      setData(result)
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInsights() }, [workspaceId, month])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <LottieAnimation animation="aiBrain" className="w-28 h-28" />
          <p className="text-sm font-bold text-[var(--fg-muted)] uppercase tracking-widest">Analisi in corso...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-44 skeleton rounded-[2.5rem]" style={{ animationDelay: `${i * 150}ms` }} />)}
        </div>
      </div>
    )
  }

  if (error || !data?.rating) {
    return (
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)] text-center space-y-4">
        <p className="text-4xl">🤖</p>
        <p className="text-[var(--fg-muted)] font-medium">Analisi temporaneamente non disponibile.</p>
        <button onClick={() => fetchInsights(true)} className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-on)] rounded-2xl text-sm font-black">
          Riprova
        </button>
      </div>
    )
  }

  const scoreColor = data.rating.score >= 80 ? 'var(--income)' : data.rating.score >= 60 ? 'var(--accent)' : data.rating.score >= 40 ? 'var(--warning)' : 'var(--expense)'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent)] text-[var(--accent-on)] rounded-2xl shadow-[0_4px_16px_var(--glow-accent)]">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Analisi del Consulente</h2>
            <p className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-[0.2em]">Valutazione patrimoniale personale</p>
          </div>
        </div>
        <button onClick={() => fetchInsights(true)} className="p-3 bg-[var(--bg-elevated)] hover:text-[var(--accent)] rounded-2xl border border-[var(--border-default)] transition-all active:scale-90">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => setShowRatingModal(true)}
          className="glass p-8 rounded-[3rem] border-2 flex flex-col items-center text-center relative overflow-hidden cursor-pointer hover:border-[var(--accent)]/50 transition-colors group"
          style={{ borderColor: `color-mix(in srgb, ${scoreColor} 30%, transparent)` }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ background: scoreColor }} />
          <ScoreArc score={data.rating.score} />
          <div className="grid grid-cols-2 gap-2 w-full mt-6">
            {Object.entries(data.rating.breakdown).map(([k, v]) => (
              <div key={k} className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
                <p className="text-[8px] font-black text-[var(--fg-subtle)] uppercase tracking-widest mb-0.5">{BREAKDOWN_LABELS[k] ?? k}</p>
                <p className="text-[10px] font-black text-[var(--fg-primary)]">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--fg-subtle)] mt-4 flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={8} /> Scopri come migliorare
          </p>
        </motion.div>

        {/* Personality Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass p-8 rounded-[3rem] border border-[var(--border-default)] flex flex-col gap-6"
        >
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent)] to-[var(--income)] rounded-2xl flex items-center justify-center shrink-0 shadow-[0_8px_24px_var(--glow-accent)]">
              <Brain size={32} className="text-white" />
            </div>
            <div className="min-w-0 text-left">
              <span className="px-2.5 py-1 bg-[var(--accent-dim)] text-[var(--accent)] text-[9px] font-black uppercase tracking-widest rounded-full border border-[var(--accent)]/20">
                Profilo psico-finanziario
              </span>
              <h3 className="text-2xl font-display font-black text-[var(--fg-primary)] mt-1.5 leading-tight">{data.personality.type}</h3>
            </div>
          </div>
          {data.personality.description && (
            <p className="text-sm text-[var(--fg-muted)] font-medium leading-relaxed text-left border-l-2 border-[var(--accent)]/40 pl-4">
              {data.personality.description}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto text-left">
            <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/60 rounded-2xl border border-[var(--border-subtle)]">
              <Zap size={15} className="text-[var(--warning)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[8px] font-black text-[var(--fg-subtle)] uppercase tracking-widest mb-1">Bias rilevato</p>
                <p className="text-[11px] font-bold text-[var(--fg-primary)] leading-snug">{data.personality.primaryBias}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/60 rounded-2xl border border-[var(--border-subtle)]">
              <TrendingUp size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[8px] font-black text-[var(--fg-subtle)] uppercase tracking-widest mb-1">Percorso di crescita</p>
                <p className="text-[11px] font-bold text-[var(--fg-primary)] leading-snug">{data.personality.migrationPath}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.insights.slice(0, 4).map((insight, idx) => {
          const meta = INSIGHT_TYPE_META[insight.type] ?? INSIGHT_TYPE_META.info
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + idx * 0.08 }}
              onClick={() => setSelectedInsight(insight)}
              className="glass p-6 rounded-[2.5rem] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 transition-all cursor-pointer group flex flex-col h-full active:scale-95"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.dim }}>{meta.label}</span>
                <span className="text-2xl group-hover:scale-110 transition-transform">{insight.icon}</span>
              </div>
              <h4 className="text-[13px] font-black text-[var(--fg-primary)] mb-2 leading-tight uppercase text-left">{insight.title}</h4>
              <p className="text-[11px] text-[var(--fg-muted)] font-medium leading-relaxed line-clamp-4 flex-1 text-left">{insight.message}</p>
              <div className="mt-4 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[var(--fg-subtle)] group-hover:opacity-100 opacity-60 transition-opacity" style={{ color: meta.color }}>
                Approfondisci <ArrowRight size={10} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Rating Detail Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
              onClick={() => setShowRatingModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="relative w-full sm:max-w-2xl glass-heavy bg-[var(--bg-surface)] rounded-t-[3rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-2xl flex flex-col"
              style={{ maxHeight: '88dvh' }}
            >
              <button onClick={() => setShowRatingModal(false)} className="absolute top-6 right-6 p-3 rounded-2xl hover:bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all z-10"><X size={22} /></button>
              <div className="overflow-y-auto flex-1 custom-scrollbar p-8 sm:p-10 space-y-8">
                <div className="space-y-1 pr-12 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Valutazione patrimoniale</p>
                  <h3 className="text-3xl font-display font-black text-[var(--fg-primary)]">Score {data.rating.label} — {data.rating.score}/100</h3>
                </div>
                <ScoreArc score={data.rating.score} />
                <div className="p-5 rounded-2xl border bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-left text-sm font-medium text-[var(--fg-muted)] leading-relaxed">
                  {data.rating.score >= 80 ? "Il tuo punteggio è eccellente. Stai gestendo le finanze in modo solido su tutti i fronti." : data.rating.score >= 60 ? "Buon punteggio. Hai basi solide ma ci sono margini di miglioramento." : data.rating.score >= 40 ? "Punteggio sufficiente. Alcuni aspetti importanti richiedono attenzione." : "Punteggio critico. La situazione finanziaria presenta vulnerabilità significative."}
                </div>
                <div className="space-y-4 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Dettaglio pilastri</p>
                  {Object.entries(data.rating.breakdown).map(([key, value]) => {
                    const isGood = ['Eccellente', 'Buona', 'Controllato', 'Efficiente'].includes(value as string)
                    const isMid  = ['Sufficiente', 'Presente', 'Moderato'].includes(value as string)
                    const color  = isGood ? 'var(--income)' : isMid ? 'var(--warning)' : 'var(--expense)'
                    const tips: Record<string, string> = {
                      liquidity: 'Benchmark: 3-6 mesi di spese come fondo di emergenza. Sotto i 3 mesi sei esposto a imprevisti gravi.',
                      savings:   'Benchmark: almeno il 10-20% del reddito mensile. Anche importi piccoli creano abitudine.',
                      lifestyle: 'Regola 50/30/20: max 30% del reddito per spese voluttuarie. Tracciare le uscite aiuta.',
                      strategy:  'Un piano attivo include: fondo emergenza, obiettivi definiti, investimento regolare.',
                    }
                    return (
                      <div key={key} className="p-5 rounded-2xl border bg-[var(--bg-elevated)]" style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">{BREAKDOWN_LABELS[key] ?? key}</p>
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>{value}</span>
                        </div>
                        <p className="text-[12px] text-[var(--fg-muted)] font-medium leading-relaxed">{tips[key] ?? ''}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="p-6 border-t border-[var(--border-subtle)] shrink-0">
                <button onClick={() => setShowRatingModal(false)} className="w-full py-4 bg-[var(--fg-primary)] text-[var(--bg-base)] font-black uppercase tracking-widest text-[12px] rounded-2xl hover:opacity-90 transition-all">Ho capito</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Insight Detail Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/85 backdrop-blur-2xl" onClick={() => setSelectedInsight(null)} />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} className="relative w-full max-w-2xl glass-heavy bg-[var(--bg-surface)] rounded-t-[3rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-2xl flex flex-col" style={{ maxHeight: '88dvh' }}>
              <div className="overflow-y-auto flex-1 custom-scrollbar p-8 sm:p-12 text-left">
                <button onClick={() => setSelectedInsight(null)} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-[var(--bg-elevated)] text-[var(--fg-muted)] transition-all"><X size={24} /></button>
                <div className="text-8xl mb-8">{selectedInsight.icon}</div>
                <h3 className="text-3xl sm:text-4xl font-display font-black text-[var(--fg-primary)] leading-none tracking-tighter mb-6">{selectedInsight.title}</h3>
                <p className="text-lg sm:text-xl text-[var(--fg-muted)] font-medium leading-relaxed mb-10">{selectedInsight.message}</p>
                {selectedInsight.detail && (
                  <div className="p-6 bg-[var(--bg-elevated)] rounded-[2rem] border border-[var(--border-subtle)] space-y-4">
                    <p className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest">Analisi dettagliata</p>
                    <p className="text-sm text-[var(--fg-primary)] leading-relaxed font-medium">{selectedInsight.detail}</p>
                  </div>
                )}
                {selectedInsight.action && (
                  <div className="p-5 rounded-2xl border-2 border-[var(--accent)]/30 bg-[var(--accent-dim)]/30 flex items-start gap-4">
                    <div className="p-2.5 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl shadow-lg shrink-0"><Zap size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mb-1.5">Azione consigliata</p>
                      <p className="text-sm font-bold text-[var(--fg-primary)] leading-snug">{selectedInsight.action}</p>
                    </div>
                  </div>
                )}
                <button onClick={() => setSelectedInsight(null)} className="w-full mt-4 py-5 bg-[var(--fg-primary)] text-[var(--bg-base)] font-black uppercase tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-95 transition-all">Ho capito</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
