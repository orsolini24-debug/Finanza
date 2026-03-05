'use client'

import { useState, useTransition, useEffect } from 'react'
import { Transaction, Category, Account, TxStatus } from '@prisma/client'
import { X, Check, Loader2 } from 'lucide-react'
import { updateTransaction } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'
import { cn, filterCategoriesByType } from '@/lib/utils'

interface TransactionEditModalProps {
  transaction: Transaction & { category: Category | null, account: Account }
  categories: Category[]
  accounts: Account[]
  onClose: () => void
}

export default function TransactionEditModal({ transaction, categories, accounts, onClose }: TransactionEditModalProps) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<'expense' | 'income'>(Number(transaction.amount) < 0 ? 'expense' : 'income')
  const [status, setStatus] = useState<TxStatus>(transaction.status)
  const router = useRouter()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const filteredCategories = filterCategoriesByType(categories, type === 'income')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Problem #39 - trim description
    const desc = (formData.get('description') as string)?.trim();
    if (!desc) {
      alert("Descrizione obbligatoria");
      return;
    }
    formData.set('description', desc);

    formData.append('type', type)
    formData.append('status', status)

    startTransition(async () => {
      try {
        await updateTransaction(transaction.id, formData)
        onClose()
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()} // Problem #33 - Backdrop click
    >
      <div className="glass bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl w-full max-w-lg border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
          <div>
            <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">Modifica Operazione</h2>
            <p className="text-xs text-[var(--fg-muted)] font-medium mt-1">Aggiorna i dettagli della transazione</p>
          </div>
          <button onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-3 hover:bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex p-1.5 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", type === 'expense' ? "bg-[var(--expense)] text-white shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]")}
            >
              Uscita
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", type === 'income' ? "bg-[var(--income)] text-[var(--accent-on)] shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]")}
            >
              Entrata
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Descrizione *</label>
              <input name="description" defaultValue={transaction.description} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Importo (€) *</label>
                <input name="amount" type="number" step="0.01" defaultValue={Math.abs(Number(transaction.amount))} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Data *</label>
                <input name="date" type="date" defaultValue={new Date(transaction.date).toISOString().split('T')[0]} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Categoria</label>
                <select name="categoryId" defaultValue={transaction.categoryId || ''} className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] appearance-none">
                  <option value="">Senza categoria</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Conto *</label>
                <select name="accountId" defaultValue={transaction.accountId} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] appearance-none">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Stato</label>
              <div className="flex p-1 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setStatus('STAGED')}
                  className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all", status === 'STAGED' ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20" : "text-[var(--fg-muted)]")}
                >
                  In Attesa
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('CONFIRMED')}
                  className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all", status === 'CONFIRMED' ? "bg-[var(--income-dim)] text-[var(--income)] border border-[var(--income)]/20" : "text-[var(--fg-muted)]")}
                >
                  Confermata
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all border border-[var(--border-subtle)]">Annulla</button>
            <button type="submit" disabled={isPending} className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all disabled:opacity-50">
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Salva Modifiche
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
