'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, Check, Calendar, ArrowRightLeft, Landmark } from 'lucide-react'
import { createTransfer } from '@/app/actions/transfers'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Account } from '@prisma/client'
import { toast } from 'sonner'

interface RegisterTransferModalProps {
  accounts: Account[]
  onClose: () => void
}

export default function RegisterTransferModal({ accounts, onClose }: RegisterTransferModalProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (fromAccountId === toAccountId) {
      toast.error("I due conti devono essere diversi.")
      return
    }

    startTransition(async () => {
      try {
        await createTransfer({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          date,
          description: description || undefined
        })
        toast.success("Trasferimento registrato")
        onClose()
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Errore durante la creazione del trasferimento')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full sm:max-w-lg glass bg-[var(--bg-surface)] rounded-t-[2rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-2xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 -mb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                <ArrowRightLeft size={24} />
              </div>
              <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">Registra Trasferimento</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--fg-muted)]">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Dal conto</label>
                <div className="relative">
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]" size={16} />
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--fg-primary)] transition-all font-medium text-base appearance-none"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[var(--fg-muted)] shadow-sm">
                  <ArrowRightLeft className="rotate-90" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Al conto</label>
                <div className="relative">
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]" size={16} />
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--fg-primary)] transition-all font-medium text-base appearance-none"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Data</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]" size={16} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--fg-primary)] transition-all font-medium text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--fg-primary)] transition-all font-mono text-xl font-bold text-center"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Descrizione (Opzionale)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="es. Giroconto"
                className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--fg-primary)] transition-all font-medium text-base"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-5 rounded-[1.5rem] bg-blue-500 text-white font-black uppercase tracking-widest text-sm shadow-xl hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Check size={20} />}
              {isPending ? 'Registrazione...' : 'Conferma Trasferimento'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
