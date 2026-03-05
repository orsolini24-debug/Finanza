'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, X, Check, Loader2, TrendingUp, TrendingDown, Calendar, Tag, Wallet, ArrowRight } from 'lucide-react'
import { createTransaction } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'
import { cn, filterCategoriesByType } from '@/lib/utils'
import { Category, Account } from '@prisma/client'
import Link from 'next/link'

interface QuickAddTransactionProps {
  categories: Category[]
  accounts: Account[]
}

export default function QuickAddTransaction({ categories, accounts }: QuickAddTransactionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const router = useRouter()

  const hasAccounts = accounts.length > 0
  const filteredCategories = filterCategoriesByType(categories, type === 'income')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Sincronizza l'account selezionato quando si apre il modal o cambiano i conti
  useEffect(() => {
    if (hasAccounts && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, hasAccounts, selectedAccountId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!hasAccounts) return

    setError(null)
    const formData = new FormData(e.currentTarget)
    
    // Problem #39 - trim description
    const desc = (formData.get('description') as string)?.trim();
    if (!desc) {
      setError("Descrizione obbligatoria");
      return;
    }
    formData.set('description', desc);

    formData.append('type', type)
    if (!formData.get('accountId')) {
      formData.append('accountId', selectedAccountId)
    }

    startTransition(async () => {
      try {
        const res = await createTransaction(formData)
        if (res.success) {
          setIsOpen(false)
          router.refresh()
        }
      } catch (err: any) {
        setError(err.message || 'Errore durante il salvataggio')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-3 rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all font-bold text-sm active:scale-95 group"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        Nuova Operazione
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="glass bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl w-full max-w-lg border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <div>
                <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">
                  Nuova Operazione
                </h2>
                <p className="text-xs text-[var(--fg-muted)] font-medium mt-1">Inserimento manuale singola transazione</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-3 hover:bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                <X className="w-6 h-6" />
              </button>
            </div>

            {!hasAccounts ? (
              <div className="p-8 space-y-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 bg-yellow-500/10 rounded-[2rem] border border-yellow-500/20">
                  <Wallet size={48} className="text-yellow-500 opacity-80" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[var(--fg-primary)]">Nessun conto configurato</h3>
                  <p className="text-sm text-[var(--fg-muted)] font-medium leading-relaxed">
                    Prima di aggiungere transazioni devi creare almeno un conto (conto corrente, carta, contanti, ecc.).
                  </p>
                </div>
                <Link 
                  href="/app/accounts" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-8 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold rounded-2xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all group"
                >
                  Vai a Conti
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Type Switcher */}
                <div className="flex p-1.5 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)]">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setType('expense')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                      type === 'expense' 
                        ? "bg-[var(--expense)] text-white shadow-lg" 
                        : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    <TrendingDown size={18} />
                    Uscita
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setType('income')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                      type === 'income' 
                        ? "bg-[var(--income)] text-[var(--accent-on)] shadow-lg" 
                        : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    <TrendingUp size={18} />
                    Entrata
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Descrizione *</label>
                    <input
                      name="description"
                      required
                      autoFocus
                      disabled={isPending} // Problem #28 - Disable inputs while loading
                      className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium disabled:opacity-50"
                      placeholder="es. Cena ristorante"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Importo (€) *</label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      disabled={isPending}
                      className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-mono font-bold text-lg disabled:opacity-50"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Data *</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
                      <input
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required
                        disabled={isPending}
                        className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Conto *</label>
                    <div className="relative">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
                      <select
                        name="accountId"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        required
                        disabled={isPending}
                        className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Categoria</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
                      <select
                        name="categoryId"
                        disabled={isPending}
                        className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="">— Nessuna —</option>
                        {filteredCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-[var(--expense-dim)] border border-[var(--expense)]/20 rounded-2xl flex items-center gap-3 animate-shake">
                     <X className="w-5 h-5 text-[var(--expense)]" />
                     <p className="text-xs text-[var(--expense)] font-bold uppercase">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all border border-[var(--border-subtle)] disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={cn(
                      "flex-[2] flex items-center justify-center gap-2 px-6 py-4 text-[var(--accent-on)] font-bold text-sm rounded-2xl transition-all disabled:opacity-50 hover:shadow-xl",
                      type === 'expense' ? "bg-[var(--expense)] hover:shadow-[0_0_30px_var(--glow-expense)]" : "bg-[var(--income)] hover:shadow-[0_0_30px_var(--glow-accent)]"
                    )}
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Salva Operazione
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
