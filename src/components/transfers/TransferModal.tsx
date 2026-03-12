'use client'

import { useState, useTransition } from 'react'
import { Account } from '@prisma/client'
import { createTransfer } from '@/app/actions/transfers'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightLeft, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TransferModalProps {
  accounts: Account[]
  onClose: () => void
  onSuccess?: () => void
}

export default function TransferModal({ accounts, onClose, onSuccess }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccountId || !toAccountId || !amount || !date) {
      return toast.error("Compila tutti i campi obbligatori")
    }
    if (fromAccountId === toAccountId) {
      return toast.error("I conti devono essere diversi")
    }
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return toast.error("L'importo deve essere positivo")
    }

    startTransition(async () => {
      try {
        await createTransfer({ fromAccountId, toAccountId, amount: numAmount, date, description })
        toast.success("Trasferimento registrato")
        onSuccess?.()
        onClose()
      } catch (error: any) {
        toast.error(error.message || "Errore durante la registrazione")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full max-w-md bg-[var(--bg-surface)] glass border border-[var(--border-default)] shadow-2xl rounded-[2rem] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--accent-dim)]/20 text-[var(--accent)] rounded-xl">
              <ArrowRightLeft size={20} />
            </div>
            <h2 className="text-xl font-display font-black tracking-tight text-[var(--fg-primary)]">Registra Trasferimento</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Da Conto</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Seleziona...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">A Conto</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Seleziona...</option>
                  {accounts.filter(a => a.id !== fromAccountId).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">Descrizione (Opzionale)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Trasferimento Conto Corrente → Risparmio"
                className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-[2] py-3 px-4 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl text-sm font-bold shadow-[0_0_20px_var(--glow-accent)] hover:opacity-90 transition-all flex justify-center items-center"
            >
              {isPending ? <Loader2 size={20} className="animate-spin" /> : "Registra Trasferimento"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
