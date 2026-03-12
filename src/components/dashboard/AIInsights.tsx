'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, X, ArrowRight, ShieldCheck, Brain, TrendingUp, Zap, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 skeleton rounded-[3rem]" />
          <div className="lg:col-span-2 h-72 skeleton rounded-[3rem]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-44 skeleton rounded-[2.5rem]" style={{ animationDelay: `${i * 150}ms` }} />)}
        </div>
        <p className="text-center text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest animate-pulse">
          Il consulente sta analizzando i tuoi dati…
        </p>
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
        <button
          onClick={() => fetchInsights(true)}
          className="p-3 bg-[var(--bg-elevated)] hover:text-[var(--accent)] rounded-2xl border border-[var(--border-default)] transition-all hover:border-[var(--accent)]/40 active:scale-90"
          title="Aggiorna analisi"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Score + Personality row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="glass p-8 rounded-[3rem] border-2 flex flex-col items-center text-center relative overflow-hidden"
          style={{ borderColor: `color-mix(in srgb, ${scoreColor} 30%, transparent)` }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: scoreColor }} />
          <ScoreArc score={data.rating.score} />
          <div className="grid grid-cols-2 gap-2 w-full mt-6">
            {Object.entries(data.rating.breakdown).map(([k, v]) => (
              <div key={k} className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
                <p className="text-[8px] font-black text-[var(--fg-subtle)] uppercase tracking-widest mb-0.5">{BREAKDOWN_LABELS[k] ?? k}</p>
                <p className="text-[11px] font-black text-[var(--fg-primary)]">{v}</p>
              </div>
            ))}
          </div>
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
            <div className="min-w-0">
              <span className="px-2.5 py-1 bg-[var(--accent-dim)] text-[var(--accent)] text-[9px] font-black uppercase tracking-widest rounded-full border border-[var(--accent)]/20">
                Profilo psico-finanziario
              </span>
              <h3 className="text-2xl font-display font-black text-[var(--fg-primary)] mt-1.5 leading-tight">{data.personality.type}</h3>
            </div>
          </div>

          {/* Description discorsiva */}
          {data.personality.description && (
            <p className="text-sm text-[var(--fg-muted)] font-medium leading-relaxed border-l-2 border-[var(--accent)]/30 pl-4">
              {data.personality.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
            <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/60 rounded-2xl border border-[var(--border-subtle)]">
              <Zap size={15} className="text-[var(--warning)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[8px] font-black text-[var(--fg-subtle)] uppercase tracking-widest mb-1">Bias rilevato</p>
                <p className="text-[11px] font-bold text-[var(--fg-primary)] leading-snug">{data.personality.primaryBias}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/60 rounded-2xl border border-[var(--border-subtle)]">
              <TrendingUp size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <div className="min-w-0">
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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.08, type: 'spring', damping: 24 }}
              onClick={() => setSelectedInsight(insight)}
              className="glass p-6 rounded-[2.5rem] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 transition-all cursor-pointer group flex flex-col h-full active:scale-95 select-none"
            >
              {/* Type badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ color: meta.color, background: meta.dim }}
                >
                  {meta.label}
                </span>
                <span className="text-2xl group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                  {insight.icon}
                </span>
              </div>

              <h4 className="text-[13px] font-black text-[var(--fg-primary)] mb-2 leading-tight tracking-tight">
                {insight.title}
              </h4>
              <p className="text-[11px] text-[var(--fg-muted)] font-medium leading-relaxed line-clamp-3 flex-1">
                {insight.message}
              </p>

              <div className="mt-4 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: meta.color }}>
                Leggi l'analisi <ChevronRight size={10} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
              onClick={() => setSelectedInsight(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full sm:max-w-2xl glass-heavy bg-[var(--bg-surface)] rounded-t-[3rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-[var(--shadow-xl)] flex flex-col"
              style={{ maxHeight: '88dvh' }}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedInsight(null)}
                className="absolute top-6 right-6 p-3 rounded-2xl hover:bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all z-10"
              >
                <X size={22} />
              </button>

              <div className="overflow-y-auto flex-1 custom-scrollbar p-8 sm:p-10 space-y-8">
                {/* Header */}
                <div className="space-y-3 pr-12">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">{selectedInsight.icon}</span>
                    <div>
                      <span
                        className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          color: INSIGHT_TYPE_META[selectedInsight.type]?.color,
                          background: INSIGHT_TYPE_META[selectedInsight.type]?.dim,
                        }}
                      >
                        {INSIGHT_TYPE_META[selectedInsight.type]?.label}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-display font-black text-[var(--fg-primary)] leading-tight tracking-tighter mt-1">
                        {selectedInsight.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Sommario (message breve) */}
                <p className="text-base font-bold text-[var(--fg-primary)] leading-relaxed border-l-2 pl-4" style={{ borderColor: INSIGHT_TYPE_META[selectedInsight.type]?.color }}>
                  {selectedInsight.message}
                </p>

                {/* Analisi discorsiva (detail) */}
                {selectedInsight.detail && (
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest">Analisi completa</p>
                    <div className="text-[15px] text-[var(--fg-muted)] font-medium leading-[1.8] whitespace-pre-line">
                      {selectedInsight.detail}
                    </div>
                  </div>
                )}

                {/* Action CTA */}
                {selectedInsight.action && (
                  <div
                    className="p-5 rounded-[1.5rem] border flex items-start gap-4"
                    style={{
                      background: INSIGHT_TYPE_META[selectedInsight.type]?.dim,
                      borderColor: `color-mix(in srgb, ${INSIGHT_TYPE_META[selectedInsight.type]?.color} 30%, transparent)`,
                    }}
                  >
                    <Sparkles size={20} className="shrink-0 mt-0.5" style={{ color: INSIGHT_TYPE_META[selectedInsight.type]?.color }} />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: INSIGHT_TYPE_META[selectedInsight.type]?.color }}>
                        Azione consigliata
                      </p>
                      <p className="text-sm font-bold text-[var(--fg-primary)] leading-snug">{selectedInsight.action}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--border-subtle)] shrink-0">
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="w-full py-4 bg-[var(--fg-primary)] text-[var(--bg-base)] font-black uppercase tracking-widest text-[12px] rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-[var(--shadow-lg)]"
                >
                  Ho capito
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
