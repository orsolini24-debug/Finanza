'use client'

import { useState, useEffect } from 'react'
import { Wallet, ChevronDown, ChevronUp, Droplets, PiggyBank, TrendingUp, Target, AlertTriangle, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import QuickAddTransaction from './QuickAddTransaction'
import { motion, AnimatePresence } from 'framer-motion'

interface DashboardHeaderProps {
  totalNetWorth: number
  liquid: number
  available: number
  savings: number
  investments: number
  earmarked: number
  debts: number
  categories: any[]
  accounts: any[]
}

export function DashboardHeader({
  totalNetWorth,
  liquid,
  available,
  savings,
  investments,
  earmarked,
  debts,
  categories,
  accounts
}: DashboardHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Problem #32 - ESC support
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Patrimonio Card */}
        <div
          className={cn(
            "lg:col-span-2 glass rounded-[2rem] md:rounded-[2.5rem] border border-[var(--border-subtle)] overflow-hidden transition-all duration-500",
            isExpanded && "border-[var(--accent)]/30 shadow-[0_0_30px_rgba(16,217,160,0.05)]"
          )}
        >
          <div className="p-5 sm:p-6 lg:p-8 flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="p-3 md:p-4 bg-[var(--bg-elevated)] rounded-2xl md:rounded-3xl border border-[var(--border-subtle)] text-[var(--fg-muted)] shrink-0">
                <Wallet size={24} className="md:hidden" />
                <Wallet size={32} className="hidden md:block" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-[0.2em] mb-1">Patrimonio Netto Totale</p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-[var(--fg-primary)] tracking-tight">
                  {formatCurrency(totalNetWorth)}
                </h1>
              </div>
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] text-[var(--fg-muted)] transition-all active:scale-95"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 pb-8 border-t border-[var(--border-subtle)] pt-8 bg-[var(--bg-elevated)]/10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <BreakdownRow label="Liquidità immediata" value={liquid} icon={<Droplets size={14} />} color="text-blue-400" sub="Conti correnti + Contanti" />
                    <BreakdownRow label="Risparmi" value={savings} icon={<PiggyBank size={14} />} color="text-[var(--income)]" sub="Conti deposito" />
                    <BreakdownRow label="Investimenti" value={investments} icon={<TrendingUp size={14} />} color="text-purple-400" sub="Azioni, Fondi, Crypto" />
                  </div>
                  <div className="space-y-4">
                    <BreakdownRow label="Accantonato Obiettivi" value={-earmarked} icon={<Target size={14} />} color="text-[var(--warning)]" sub="Fondi bloccati per traguardi" />
                    <BreakdownRow label="Debiti e Passività" value={debts} icon={<AlertTriangle size={14} />} color="text-[var(--expense)]" sub="Mutui, Prestiti, Carte" />
                    <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-[var(--fg-primary)]">Disponibile Reale</span>
                        <span className="text-xl font-mono font-black text-[var(--accent)]">{formatCurrency(available)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Actions Card */}
        <div className="glass p-5 sm:p-6 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-[var(--accent)] shadow-[0_0_40px_rgba(16,217,160,0.1)] flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--accent)]/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mb-1">Portafoglio</p>
            <h2 className="text-xl font-display font-bold text-[var(--fg-primary)]">Azioni Rapide</h2>
          </div>
          <div className="space-y-3 relative z-10">
            <QuickAddTransaction categories={categories} accounts={accounts} />
            <a href="/app/import" className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--bg-elevated)] text-[var(--fg-primary)] rounded-2xl font-bold text-sm hover:bg-[var(--bg-elevated)]/80 transition-all border border-[var(--border-subtle)]">
              Importa CSV
            </a>
          </div>
        </div>
      </div>

      {/* Prominent KPI "Disponibile Ora" */}
      <div className="flex justify-center md:justify-start">
        <div className="glass w-full md:w-auto px-5 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 rounded-[2rem] md:rounded-[2.5rem] border border-[var(--accent)]/30 bg-[var(--accent-dim)]/5 flex items-center gap-4 md:gap-6 shadow-xl animate-in zoom-in-95 duration-700">
          <div className="p-3 md:p-4 bg-[var(--accent)] rounded-[1.5rem] md:rounded-[2rem] text-[var(--accent-on)] shadow-[0_0_20px_var(--glow-accent)] shrink-0">
            <Droplets size={22} className="md:hidden" />
            <Droplets size={28} className="hidden md:block" />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)] mb-1">Liquidità Disponibile Ora</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-[var(--fg-primary)] tracking-tighter">
              {formatCurrency(available)}
            </p>
            <p className="text-[9px] text-[var(--fg-muted)] font-medium mt-1 italic">Sottratti {formatCurrency(Math.abs(earmarked))} già destinati agli obiettivi</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BreakdownRow({ label, value, icon, color, sub }: any) {
  return (
    <div className="flex items-start justify-between group">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 bg-[var(--bg-input)] rounded-lg border border-[var(--border-subtle)]", color)}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-bold text-[var(--fg-primary)]">{label}</p>
          <p className="text-[9px] text-[var(--fg-muted)] font-medium">{sub}</p>
        </div>
      </div>
      <span className={cn("font-mono font-bold text-sm", value < 0 ? "text-[var(--expense)]" : "text-[var(--fg-primary)]")}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}
