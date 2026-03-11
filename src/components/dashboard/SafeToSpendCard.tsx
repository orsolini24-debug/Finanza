'use client'

import { ShieldCheck, Info, TrendingUp, CalendarClock, PiggyBank } from 'lucide-react'
import { Amount } from '../ui/Amount'
import { Tooltip } from '../ui/Tooltip'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SafeToSpendCardProps {
  amount: number
  liquidBalance: number
  budgetReserved: number
  upcomingExpenses: number
}

export function SafeToSpendCard({ amount, liquidBalance, budgetReserved, upcomingExpenses }: SafeToSpendCardProps) {
  const isHealthy = amount > 0

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass relative overflow-hidden p-6 sm:p-8 rounded-[2.5rem] border-2 transition-all duration-500",
        isHealthy ? "border-[var(--accent)]/20 shadow-[0_20px_50px_rgba(16,217,160,0.05)]" : "border-[var(--expense)]/20 shadow-[0_20px_50px_rgba(255,77,77,0.05)]"
      )}
    >
      {/* Decorative Background */}
      <div className={cn(
        "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20",
        isHealthy ? "bg-[var(--accent)]" : "bg-[var(--expense)]"
      )} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-2xl shadow-lg",
              isHealthy ? "bg-[var(--accent)] text-[var(--accent-on)]" : "bg-[var(--expense)] text-white"
            )}>
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-display font-black text-[var(--fg-primary)] tracking-tight italic">Safe-to-Spend</h3>
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="text-[10px] font-black uppercase tracking-widest">Oggi</span>
                <Tooltip content="La cifra che puoi spendere oggi senza intaccare i tuoi budget e le tue scadenze fisse del mese.">
                  <Info size={10} className="cursor-help" />
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="px-4 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full">
             <span className={cn("text-[10px] font-black uppercase tracking-widest", isHealthy ? "text-[var(--accent)]" : "text-[var(--expense)]")}>
                {isHealthy ? 'Stato: Ottimo' : 'Attenzione'}
             </span>
          </div>
        </div>

        <div className="mb-8">
          <Amount 
            value={amount} 
            className={cn(
              "text-5xl sm:text-6xl font-display font-black tracking-tighter",
              isHealthy ? "text-[var(--accent)]" : "text-[var(--expense)]"
            )} 
          />
          <p className="text-[11px] text-[var(--fg-muted)] font-bold mt-2 max-w-[200px] leading-tight">
            Denaro disponibile dopo aver sottratto budget e bollette.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest">
              <TrendingUp size={10} /> Liquidità
            </div>
            <Amount value={liquidBalance} className="text-sm font-bold text-[var(--fg-primary)]" hideLabel />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest">
              <PiggyBank size={10} /> Budget Res.
            </div>
            <Amount value={-budgetReserved} className="text-sm font-bold text-[var(--expense)]" hideLabel />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest">
              <CalendarClock size={10} /> Scadenze
            </div>
            <Amount value={-upcomingExpenses} className="text-sm font-bold text-[var(--expense)]" hideLabel />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
