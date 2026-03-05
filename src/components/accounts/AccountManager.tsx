'use client'

import { useState, useTransition } from 'react'
import { Account, AccountType } from '@prisma/client'
import { Plus, Edit2, Trash2, X, Check, Loader2, Wallet, CreditCard, PiggyBank, Landmark, TrendingUp, DollarSign } from 'lucide-react'
import { createAccount, updateAccount, deleteAccount } from '@/app/actions/accounts'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AccountManagerProps {
  accounts: (Account & { _count: { transactions: number } })[]
}

const TYPE_INFO: Record<AccountType, { label: string, icon: any, color: string }> = {
  CHECKING: { label: 'Conto Corrente', icon: Landmark, color: 'text-blue-400 bg-blue-500/10' },
  SAVINGS: { label: 'Risparmi', icon: PiggyBank, color: 'text-[var(--income)] bg-[var(--income-dim)]' },
  CREDIT_CARD: { label: 'Carta di Credito', icon: CreditCard, color: 'text-[var(--expense)] bg-[var(--expense-dim)]' },
  CASH: { label: 'Contanti', icon: Wallet, color: 'text-orange-400 bg-orange-500/10' },
  INVESTMENT: { label: 'Investimenti', icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10' },
  LOAN: { label: 'Prestito', icon: DollarSign, color: 'text-gray-400 bg-gray-500/10' },
  MORTGAGE: { label: 'Mutuo', icon: Landmark, color: 'text-red-400 bg-red-500/10' },
}

export default function AccountManager({ accounts }: AccountManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const openCreate = () => {
    setEditingAccount(null)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (acc: Account) => {
    setEditingAccount(acc)
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (editingAccount) {
          await updateAccount(editingAccount.id, formData)
        } else {
          await createAccount(formData)
        }
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Errore durante il salvataggio')
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Eliminare questo conto? Assicurati che non ci siano transazioni associate.")) return
    startTransition(async () => {
      try {
        await deleteAccount(id)
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-3 rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all font-bold text-sm"
        >
          <Plus className="w-5 h-5" />
          Aggiungi Conto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const info = TYPE_INFO[acc.type]
          const Icon = info.icon
          return (
            <div key={acc.id} className="glass p-8 rounded-[2.5rem] hover:-translate-y-2 transition-all duration-500 group border border-[var(--border-subtle)] relative overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform duration-500", info.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(acc)} className="p-2 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--accent)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="p-2 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-[0.2em] mb-1">{info.label}</p>
                <h3 className="text-xl font-display font-bold text-[var(--fg-primary)] group-hover:text-[var(--accent)] transition-colors">{acc.name}</h3>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Saldo Iniziale</p>
                  <p className="text-lg font-mono font-bold text-[var(--fg-primary)] mt-1">
                    {acc.currency} {Number(acc.openingBal).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Transazioni</p>
                  <p className="text-sm font-bold text-[var(--fg-muted)] mt-1">{acc._count.transactions} record</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl w-full max-w-md border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95">
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">
                {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-3 hover:bg-[var(--bg-elevated)] rounded-2xl">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome Conto *</label>
                <input
                  name="name"
                  defaultValue={editingAccount?.name || ''}
                  required
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-medium"
                  placeholder="es. Conto Intesa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Tipo di Conto *</label>
                <select
                  name="type"
                  defaultValue={editingAccount?.type || 'CHECKING'}
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-medium appearance-none cursor-pointer"
                >
                  {Object.entries(TYPE_INFO).map(([val, info]) => (
                    <option key={val} value={val}>{info.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Saldo Iniziale (€) *</label>
                  <input
                    name="openingBal"
                    type="number"
                    step="0.01"
                    defaultValue={editingAccount ? Number(editingAccount.openingBal) : 0}
                    required
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Valuta</label>
                  <input
                    name="currency"
                    defaultValue={editingAccount?.currency || 'EUR'}
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-bold"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-[var(--expense)] font-bold">{error}</p>}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all">Annulla</button>
                <button type="submit" disabled={isPending} className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all disabled:opacity-50">
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {editingAccount ? 'Salva Modifiche' : 'Crea Conto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
