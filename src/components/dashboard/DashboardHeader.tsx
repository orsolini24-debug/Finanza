'use client'

import { useState, useEffect } from 'react'
import { Wallet, ChevronDown, ChevronUp, Droplets, PiggyBank, TrendingUp, Target, AlertTriangle, X, Info, HelpCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import QuickAddTransaction from './QuickAddTransaction'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip } from '@/components/ui/Tooltip'

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
  userName?: string
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
  accounts,
  userName,
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

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buongiorno'
    if (h < 18) return 'Buonasera'
    return 'Buonasera'
  })()

  const todayLabel = (() => {
    return new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  })()

  return (
    <div className="space-y-6">
      {userName && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <p className="text-lg font-display font-bold text-[var(--fg-primary)]">
              {greeting}, <span className="text-[var(--accent)]">{userName}</span>!
            </p>
          </div>
          <p className="text-xs text-[var(--fg-muted)] font-medium capitalize hidden sm:block">{todayLabel}</p>
        </div>
      )}
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
                <div className="mb-6 flex items-start gap-2 p-3 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
                  <Info size={13} className="text-[var(--accent)] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[var(--fg-muted)] leading-relaxed">
                    I valori si popolano automaticamente dai <span className="font-bold text-[var(--fg-primary)]">tipi di conto</span> che crei.
                    Es: crea un conto di tipo <span className="font-bold text-purple-400">Investimento</span> per Crypto/ETF,
                    <span className="font-bold text-[var(--income)]"> Deposito</span> per i risparmi,
                    <span className="font-bold text-[var(--expense)]"> Prestito</span> per i debiti.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <BreakdownRow label="Liquidità immediata" value={liquid} icon={<Droplets size={14} />} color="text-blue-400" sub="Conti Corrente + Contanti" tooltip="Saldo disponibile subito. Comprende tutti i conti di tipo Corrente e Contanti." />
                    <BreakdownRow label="Risparmi" value={savings} icon={<PiggyBank size={14} />} color="text-[var(--income)]" sub="Conti Deposito" tooltip="Saldo dei conti Deposito. Denaro accantonato ma non immediatamente spendibile." />
                    <BreakdownRow label="Investimenti" value={investments} icon={<TrendingUp size={14} />} color="text-purple-400" sub="Conti tipo Investimento (ETF, Crypto…)" tooltip="Valore dei conti di tipo Investimento: azioni, ETF, crypto, fondi. Crea un conto Investimento per popolare questa voce." />
                  </div>
                  <div className="space-y-4">
                    <BreakdownRow label="Accantonato Obiettivi" value={-earmarked} icon={<Target size={14} />} color="text-[var(--warning)]" sub="Fondi bloccati per traguardi" tooltip="Somma degli importi già assegnati agli Obiettivi di risparmio. Viene sottratta dalla Liquidità Disponibile." />
                    <BreakdownRow label="Debiti e Passività" value={debts} icon={<AlertTriangle size={14} />} color="text-[var(--expense)]" sub="Mutui, Prestiti, Carte" tooltip="Saldo dei conti Prestito e Mutuo. Di solito negativo perché rappresenta denaro che devi restituire." />
                    <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                      <div className="flex justify-between items-center">
                        <Tooltip content="Liquidità immediata meno gli importi già destinati agli Obiettivi. È il denaro che puoi spendere senza intaccare i tuoi piani." side="top">
                          <span className="text-xs font-black uppercase text-[var(--fg-primary)] cursor-help border-b border-dashed border-[var(--border-default)]">Disponibile Reale</span>
                        </Tooltip>
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
        <div className={cn(
          "glass w-full md:w-auto px-5 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 rounded-[2rem] md:rounded-[2.5rem] flex items-center gap-4 md:gap-6 shadow-xl animate-in zoom-in-95 duration-700",
          available < 0
            ? "border border-[var(--expense)]/40 bg-[var(--expense-dim)]/10"
            : "border border-[var(--accent)]/30 bg-[var(--accent-dim)]/5"
        )}>
          <div className={cn(
            "p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shrink-0",
            available < 0
              ? "bg-[var(--expense)] text-white shadow-[0_0_20px_var(--expense)]"
              : "bg-[var(--accent)] text-[var(--accent-on)] shadow-[0_0_20px_var(--glow-accent)]"
          )}>
            <Droplets size={22} className="md:hidden" />
            <Droplets size={28} className="hidden md:block" />
          </div>
          <div>
            <p className={cn(
              "text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1",
              available < 0 ? "text-[var(--expense)]" : "text-[var(--accent)]"
            )}>
              {available < 0 ? "⚠ Liquidità Insufficiente" : "Liquidità Disponibile Ora"}
            </p>
            <p className={cn(
              "text-2xl sm:text-3xl lg:text-4xl font-mono font-black tracking-tighter",
              available < 0 ? "text-[var(--expense)]" : "text-[var(--fg-primary)]"
            )}>
              {formatCurrency(available)}
            </p>
            <p className="text-[9px] text-[var(--fg-muted)] font-medium mt-1 italic">
              {available < 0
                ? `Gli obiettivi (${formatCurrency(earmarked)}) superano la liquidità disponibile`
                : `Sottratti ${formatCurrency(Math.abs(earmarked))} già destinati agli obiettivi`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BreakdownRow({ label, value, icon, color, sub, tooltip }: any) {
  return (
    <div className="flex items-start justify-between group">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 bg-[var(--bg-input)] rounded-lg border border-[var(--border-subtle)]", color)}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-bold text-[var(--fg-primary)]">{label}</p>
            {tooltip && (
              <Tooltip content={tooltip} side="right">
                <HelpCircle size={11} className="text-[var(--fg-subtle)] cursor-help opacity-60 hover:opacity-100 transition-opacity" />
              </Tooltip>
            )}
          </div>
          <p className="text-[9px] text-[var(--fg-muted)] font-medium">{sub}</p>
        </div>
      </div>
      <span className={cn("font-mono font-bold text-sm", value < 0 ? "text-[var(--expense)]" : "text-[var(--fg-primary)]")}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}
