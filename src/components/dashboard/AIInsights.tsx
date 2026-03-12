'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, X, ArrowRight, ShieldCheck, Brain, TrendingUp, Info, AlertTriangle, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AIInsight {
  type: 'positive' | 'warning' | 'tip' | 'info'
  icon: string
  title: string
  message: string
}

interface AIResponse {
  rating: {
    score: number
    label: string
    breakdown: { liquidity: string; savings: string; lifestyle: string; strategy: string }
  }
  personality: { type: string; migrationPath: string; primaryBias: string }
  insights: AIInsight[]
}

export default function AIInsights({ workspaceId, month }: { workspaceId: string; month: string }) {
  const [data, setData] = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)

  const fetchInsights = async (force = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, month, force })
      })
      const result = await res.json()
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [workspaceId, month])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div className="md:col-span-1 h-64 bg-[var(--bg-elevated)] rounded-[2.5rem]" />
        <div className="md:col-span-2 h-64 bg-[var(--bg-elevated)] rounded-[2.5rem]" />
      </div>
    )
  }

  if (!data?.rating) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl shadow-lg shadow-[var(--accent-dim)]">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Valutazione del Ministro</h2>
            <p className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-[0.2em]">Framework Accademico v3.0</p>
          </div>
        </div>
        <button 
          onClick={() => fetchInsights(true)}
          className="p-3 bg-[var(--bg-elevated)] hover:text-[var(--accent)] rounded-2xl border border-[var(--border-default)] transition-all"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SCORE CARD */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="glass p-8 rounded-[3rem] border-2 border-[var(--accent)]/20 flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl" />
          
          <div className="relative w-32 h-32 mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-[var(--bg-elevated)] stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
              <motion.circle 
                initial={{ strokeDasharray: "0 251" }}
                animate={{ strokeDasharray: `${(data.rating.score / 100) * 251} 251` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="text-[var(--accent)] stroke-current" strokeWidth="8" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-display font-black text-[var(--fg-primary)]">{data.rating.score}</span>
              <span className="text-[10px] font-black text-[var(--accent)] uppercase">Score</span>
            </div>
          </div>

          <h3 className="text-xl font-black text-[var(--fg-primary)] mb-2">Rating: {data.rating.label}</h3>
          <div className="grid grid-cols-2 gap-2 w-full mt-4">
            {Object.entries(data.rating.breakdown).map(([k, v]) => (
              <div key={k} className="p-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
                <p className="text-[8px] font-black text-[var(--fg-subtle)] uppercase tracking-tighter">{k}</p>
                <p className="text-[10px] font-bold text-[var(--fg-primary)]">{v}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* PERSONALITY CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass p-8 rounded-[3rem] border border-[var(--border-default)] flex flex-col md:flex-row gap-8 items-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[var(--accent)] to-blue-500 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl">
            <Brain size={48} className="text-[var(--accent-on)]" />
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <span className="px-3 py-1 bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-black uppercase tracking-widest rounded-full border border-[var(--accent)]/20">
                Profilo Rilevato
              </span>
              <h3 className="text-3xl font-display font-black text-[var(--fg-primary)] mt-2">{data.personality.type}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/50 rounded-2xl border border-[var(--border-subtle)]">
                <Zap size={16} className="text-amber-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black text-[var(--fg-subtle)] uppercase">Bias Primario</p>
                  <p className="text-xs font-bold text-[var(--fg-primary)]">{data.personality.primaryBias}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/50 rounded-2xl border border-[var(--border-subtle)]">
                <TrendingUp size={16} className="text-[var(--accent)] shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black text-[var(--fg-subtle)] uppercase">Roadmap di Crescita</p>
                  <p className="text-xs font-bold text-[var(--fg-primary)]">{data.personality.migrationPath}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* INSIGHTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.insights.map((insight, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            onClick={() => setSelectedInsight(insight)}
            className="glass p-6 rounded-[2.5rem] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 transition-all cursor-pointer group flex flex-col h-full active:scale-95"
          >
            <div className="text-4xl mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform">{insight.icon}</div>
            <h4 className="text-[13px] font-black text-[var(--fg-primary)] mb-2 leading-tight uppercase tracking-tight">{insight.title}</h4>
            <p className="text-[11px] text-[var(--fg-muted)] font-medium leading-relaxed line-clamp-3 flex-1">{insight.message}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black text-[var(--accent)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Deep Dive <ArrowRight size={10} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedInsight && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInsight(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="relative w-full max-w-2xl glass bg-[var(--bg-surface)] rounded-t-[3rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-8 sm:p-12 overflow-y-auto custom-scrollbar">
                <button onClick={() => setSelectedInsight(null)} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-[var(--bg-elevated)] text-[var(--fg-muted)] transition-all"><X size={24} /></button>
                <div className="text-8xl mb-8">{selectedInsight.icon}</div>
                <h3 className="text-3xl sm:text-4xl font-display font-black text-[var(--fg-primary)] leading-none tracking-tighter mb-6">{selectedInsight.title}</h3>
                <p className="text-lg sm:text-xl text-[var(--fg-muted)] font-medium leading-relaxed mb-10">{selectedInsight.message}</p>
                
                <div className="p-6 bg-[var(--bg-elevated)] rounded-[2rem] border border-[var(--border-subtle)] flex items-start gap-4">
                  <div className="p-3 bg-[var(--accent)] text-[var(--accent-on)] rounded-2xl shadow-xl"><Info size={24} /></div>
                  <div>
                    <p className="text-xs font-black text-[var(--fg-primary)] uppercase tracking-widest mb-1">Nota del Ministro</p>
                    <p className="text-sm text-[var(--fg-muted)] leading-relaxed">Questa raccomandazione è basata su modelli di ottimizzazione matematica e flussi di cassa reali. L'accuratezza è garantita dal framework 3.0.</p>
                  </div>
                </div>
                
                <button onClick={() => setSelectedInsight(null)} className="w-full mt-8 py-5 bg-[var(--fg-primary)] text-[var(--bg-base)] font-black uppercase tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">Ho Ricevuto l'Ordine</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
