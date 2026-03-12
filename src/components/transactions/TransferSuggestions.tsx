'use client'

import { useState, useTransition } from 'react'
import { ArrowRightLeft, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { confirmTransferCandidate, ignoreTransferCandidate } from '@/app/actions/transfers'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatCurrency } from '@/lib/utils'

interface TransferCandidate {
  tx1: { id: string; accountId: string; accountName: string; amount: number; date: string; description: string }
  tx2: { id: string; accountId: string; accountName: string; amount: number; date: string; description: string }
  diff: number
}

interface TransferSuggestionsProps {
  candidates: TransferCandidate[]
}

export default function TransferSuggestions({ candidates: initialCandidates }: TransferSuggestionsProps) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleConfirm = (tx1Id: string, tx2Id: string) => {
    startTransition(async () => {
      try {
        await confirmTransferCandidate(tx1Id, tx2Id)
        setCandidates(prev => prev.filter(c => c.tx1.id !== tx1Id && c.tx2.id !== tx2Id))
        router.refresh()
      } catch (err: any) {
        alert(err.message || 'Errore durante la conferma del trasferimento')
      }
    })
  }

  const handleIgnore = (tx1Id: string, tx2Id: string) => {
    startTransition(async () => {
      try {
        await ignoreTransferCandidate(tx1Id, tx2Id)
        setCandidates(prev => prev.filter(c => c.tx1.id !== tx1Id && c.tx2.id !== tx2Id))
      } catch (err: any) {
        alert(err.message || 'Errore')
      }
    })
  }

  if (candidates.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
          <ArrowRightLeft size={16} />
        </div>
        <h3 className="text-sm font-black text-[var(--fg-primary)] uppercase tracking-widest">
          Trasferimenti Rilevati ({candidates.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode='popLayout'>
          {candidates.map((c) => (
            <motion.div
              key={`${c.tx1.id}-${c.tx2.id}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass p-4 rounded-3xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group"
            >
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-full">
                    Possibile Giroconto
                  </span>
                  <span className="text-[10px] font-bold text-[var(--fg-subtle)]">
                    {new Date(c.tx1.date).toLocaleDateString('it-IT')}
                  </span>
                </div>

                <div className="flex items-center gap-2 justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-[var(--fg-primary)] truncate">{c.tx1.accountName}</p>
                    <p className="text-[13px] font-bold text-[var(--expense)] tracking-tighter">{formatCurrency(c.tx1.amount)}</p>
                  </div>
                  <div className="shrink-0 text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[11px] font-black text-[var(--fg-primary)] truncate">{c.tx2.accountName}</p>
                    <p className="text-[13px] font-bold text-[var(--income)] tracking-tighter">+{formatCurrency(c.tx2.amount)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-blue-500/10">
                  <button
                    onClick={() => handleConfirm(c.tx1.id, c.tx2.id)}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                    Collega e Conferma
                  </button>
                  <button
                    onClick={() => handleIgnore(c.tx1.id, c.tx2.id)}
                    disabled={isPending}
                    className="p-2 bg-[var(--bg-elevated)] text-[var(--fg-subtle)] hover:text-[var(--expense)] rounded-xl transition-all active:scale-95"
                    title="Ignora suggerimento"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
