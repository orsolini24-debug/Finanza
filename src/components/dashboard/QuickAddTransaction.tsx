'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, Check, Calendar, ArrowRightLeft } from 'lucide-react'
import { createTransaction } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Account, Category } from '@prisma/client'
import RegisterTransferModal from './RegisterTransferModal'

interface QuickAddTransactionProps {
  workspaceId: string
  accounts: Account[]
  categories: Category[]
  currentMonth: string
}

export default function QuickAddTransaction({ workspaceId, accounts, categories, currentMonth }: QuickAddTransactionProps) {
  const [open, setOpen] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const amount = formData.get('amount') as string
    
    // Se è uscita, rendi importo negativo
    if (type === 'EXPENSE') {
      formData.set('amount', `-${Math.abs(Number(amount))}`)
    } else {
      formData.set('amount', `${Math.abs(Number(amount))}`)
    }

    startTransition(async () => {
      try {
        await createTransaction(formData)
        toast.success("Operazione registrata")
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Errore durante la creazione')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-14 h-14 md:w-16 md:h-16 bg-[var(--accent)] text-[var(--accent-on)] rounded-full flex items-center justify-center shadow-[0_0_30px_var(--glow-accent)] hover:scale-110 transition-all z-40 group"
      >
        <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full sm:max-w-lg glass bg-[var(--bg-surface)] rounded-t-[2.5rem] sm:rounded-[3rem] border border-[var(--border-default)] shadow-2xl overflow-hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              {/* Handle mobile */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 -mb-2">
                <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
              </div>

              <div className="p-6 sm:p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">Nuova Operazione</h2>
                  <button onClick={() => setOpen(false)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--fg-muted)]">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex p-1 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)]">
                  <button
                    onClick={() => setType('EXPENSE')}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all",
                      type === 'EXPENSE' ? "bg-[var(--expense)] text-white shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    Uscita
                  </button>
                  <button
                    onClick={() => setType('INCOME')}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all",
                      type === 'INCOME' ? "bg-[var(--income)] text-white shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    Entrata
                  </button>
                  <button
                    onClick={() => { setOpen(false); setShowTransferModal(true); }}
                    className="flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all text-[var(--fg-muted)] hover:text-blue-400 hover:bg-blue-500/5"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <ArrowRightLeft size={12} />
                      <span>Trasf.</span>
                    </div>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="status" value="CONFIRMED" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Data</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]" size={16} />
                        <input
                          type="date"
                          name="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium text-base"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Importo (€)</label>
                      <input
                        type="number"
                        name="amount"
                        step="0.01"
                        required
                        placeholder="0.00"
                        autoFocus
                        className={cn(
                          "w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 text-[var(--fg-primary)] transition-all font-mono text-xl font-bold text-center",
                          type === 'EXPENSE' ? "focus:ring-[var(--expense)]" : "focus:ring-[var(--income)]"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Descrizione</label>
                    <input
                      name="description"
                      required
                      placeholder="es. Spesa settimanale"
                      className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium text-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Conto</label>
                      <select
                        name="accountId"
                        required
                        className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium text-base appearance-none"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Categoria</label>
                      <select
                        name="categoryId"
                        className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium text-base appearance-none"
                      >
                        <option value="">Nessuna</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className={cn(
                      "w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3",
                      type === 'EXPENSE' 
                        ? "bg-[var(--expense)] text-white hover:shadow-[0_0_30px_var(--glow-expense)]" 
                        : "bg-[var(--income)] text-white hover:shadow-[0_0_30px_var(--glow-accent)]",
                      isPending && "opacity-50"
                    )}
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                    {isPending ? 'Salvataggio...' : 'Conferma Operazione'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTransferModal && (
          <RegisterTransferModal 
            accounts={accounts} 
            onClose={() => setShowTransferModal(false)} 
          />
        )}
      </AnimatePresence>
    </>
  )
}
