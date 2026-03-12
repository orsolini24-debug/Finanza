'use client'

import { useState, useTransition, useEffect } from 'react'
import { Account, AccountType } from '@prisma/client'
import { Plus, Edit2, Trash2, X, Check, Loader2, Wallet, CreditCard, PiggyBank, Banknote, TrendingUp, Building2 } from 'lucide-react'
import { createAccount, updateAccount, deleteAccount } from '@/app/actions/accounts'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface AccountWithBalance extends Account {
  balance: number;
}

interface AccountsManagerProps {
  accounts: AccountWithBalance[];
  openModalByDefault?: boolean;
}

const TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conto Corrente',
  SAVINGS: 'Risparmi',
  CREDIT_CARD: 'Carta di Credito',
  CASH: 'Contanti',
  INVESTMENT: 'Investimenti',
  LOAN: 'Prestito',
  MORTGAGE: 'Mutuo',
}

const TYPE_COLORS: Record<AccountType, string> = {
  CHECKING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SAVINGS: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  CREDIT_CARD: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CASH: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  INVESTMENT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  LOAN: 'bg-red-500/10 text-red-400 border-red-500/20',
  MORTGAGE: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const TYPE_ICONS: Record<AccountType, any> = {
  CHECKING: Wallet,
  SAVINGS: PiggyBank,
  CREDIT_CARD: CreditCard,
  CASH: Banknote,
  INVESTMENT: TrendingUp,
  LOAN: Building2,
  MORTGAGE: Building2,
}

export default function AccountsManager({ accounts, openModalByDefault = false }: AccountsManagerProps) {
  const [showModal, setShowModal] = useState(openModalByDefault)
  const [editingAccount, setEditingAccount] = useState<AccountWithBalance | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { confirm, open, handleConfirm, handleCancel, message } = useConfirm()

  const closePortal = () => {
    setShowModal(false);
    setEditingAccount(null);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePortal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const openCreate = () => {
    setEditingAccount(null)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (acc: AccountWithBalance) => {
    setEditingAccount(acc)
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      toast.error("Nome obbligatorio");
      return;
    }
    formData.set('name', name);

    startTransition(async () => {
      try {
        if (editingAccount) {
          await updateAccount(editingAccount.id, formData)
          toast.success("Conto aggiornato")
        } else {
          await createAccount(formData)
          toast.success("Conto creato")
        }
        closePortal()
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Errore durante il salvataggio")
      }
    })
  }

  const handleDelete = async (id: string, name: string) => {
    if (await confirm(`Eliminare il conto "${name}"? Verranno eliminate anche tutte le transazioni associate.`)) {
      startTransition(async () => {
        try {
          await deleteAccount(id)
          toast.success("Conto eliminato")
          router.refresh()
        } catch (err: any) {
          toast.error(err.message || "Errore durante l'eliminazione")
        }
      })
    }
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog 
        open={open} 
        message={message} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />

      <div className="flex justify-between items-center px-2">
        <h2 className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-[0.2em]">Elenco Conti Disponibili</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-2.5 rounded-2xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all font-bold text-sm active:scale-95"
        >
          <Plus size={18} />
          Nuovo Conto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const Icon = TYPE_ICONS[acc.type]
          return (
            <div key={acc.id} className="glass p-8 rounded-[2.5rem] group border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-500 relative overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div className={cn("p-4 rounded-2xl transition-all duration-500", TYPE_COLORS[acc.type])}>
                  <Icon size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(acc)} className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--accent)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(acc.id, acc.name)} disabled={isPending} className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", TYPE_COLORS[acc.type])}>
                  {TYPE_LABELS[acc.type]}
                </span>
                <h3 className="text-xl font-display font-bold text-[var(--fg-primary)] mt-3 group-hover:text-[var(--accent)] transition-colors line-clamp-1">{acc.name}</h3>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mb-1 text-right">Saldo Attuale</p>
                <p className={cn(
                  "text-3xl font-mono font-black tracking-tighter text-right",
                  acc.balance >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
                )}>
                  {formatCurrency(acc.balance)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && closePortal()}
        >
          <div className="glass bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl w-full max-w-md border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)] tracking-tight">
                {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
              </h2>
              <button onClick={closePortal} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-3 hover:bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome Conto *</label>
                <input
                  name="name"
                  defaultValue={editingAccount?.name || ''}
                  required
                  autoFocus
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-medium transition-all"
                  placeholder="es. Conto Intesa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Tipo di Conto *</label>
                <div className="relative">
                  <select
                    name="type"
                    defaultValue={editingAccount?.type || 'CHECKING'}
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-medium appearance-none cursor-pointer"
                  >
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fg-subtle)]">
                    <TrendingUp size={16} className="rotate-90" />
                  </div>
                </div>
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
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-mono font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Valuta</label>
                  <input
                    name="currency"
                    defaultValue={editingAccount?.currency || 'EUR'}
                    required
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-bold uppercase"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closePortal} className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all border border-[var(--border-subtle)]">Annulla</button>
                <button type="submit" disabled={isPending} className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all active:scale-95 disabled:opacity-50">
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
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
