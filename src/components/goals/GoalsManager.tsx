'use client'

import { useState, useTransition, useEffect } from 'react'
import { Goal, Account } from '@prisma/client'
import { Plus, Target, Edit2, Trash2, X, Check, Loader2, TrendingUp, PiggyBank, CreditCard, Star, Calendar, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react'
import { createGoal, updateGoal, deleteGoal } from '@/app/actions/goals'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import LottieAnimation from '@/components/ui/LottieAnimation'
import { useConfirm } from '@/hooks/useConfirm'

const GOAL_TYPES = [
  { value: 'savings', label: 'Risparmio', icon: PiggyBank, color: 'text-[var(--income)] bg-[var(--income-dim)]', border: 'border-[var(--income)]/20', bar: 'bg-[var(--income)]' },
  { value: 'debt', label: 'Estinzione Debito', icon: CreditCard, color: 'text-[var(--expense)] bg-[var(--expense-dim)]', border: 'border-[var(--expense)]/20', bar: 'bg-[var(--expense)]' },
  { value: 'investment', label: 'Investimento', icon: TrendingUp, color: 'text-[var(--info)] bg-[var(--info-dim)]', border: 'border-[var(--info)]/20', bar: 'bg-[var(--info)]' },
  { value: 'other', label: 'Altro', icon: Star, color: 'text-purple-500 bg-purple-500/10', border: 'border-purple-500/20', bar: 'bg-purple-500' },
]

function getTypeInfo(type: string) {
  return GOAL_TYPES.find(t => t.value === type) ?? GOAL_TYPES[3]
}

interface GoalsManagerProps {
  goals: Goal[]
  accounts: Account[]
}

export default function GoalsManager({ goals, accounts }: GoalsManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { confirm, open, handleConfirm, handleCancel, message } = useConfirm()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const openCreate = () => {
    setEditingGoal(null)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    // Problem #39 - trim name
    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      setError("Nome obbligatorio");
      return;
    }
    const targetAmount = Number(formData.get('targetAmount'));
    const currentAmount = Number(formData.get('currentAmount'));

    if (currentAmount > targetAmount) {
      setError("L'importo attuale non può superare il target");
      return;
    }

    startTransition(async () => {
      try {
        if (editingGoal) {
          await updateGoal(editingGoal.id, formData)
          toast.success("Obiettivo aggiornato")
        } else {
          await createGoal(formData)
          toast.success("Obiettivo creato")
        }
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Errore durante il salvataggio')
      }
    })
  }

  const handleDelete = async (goal: Goal) => {
    if (await confirm(`Eliminare l'obiettivo "${goal.name}"?`)) {
      startTransition(async () => {
        try {
          await deleteGoal(goal.id)
          toast.success("Obiettivo eliminato")
          router.refresh()
        } catch (err: any) {
          toast.error(err.message || "Errore durante l'eliminazione")
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog 
        open={open} 
        message={message} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuovo Obiettivo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">        
        {goals.map((goal, idx) => {
          const typeInfo = getTypeInfo(goal.type)
          const Icon = typeInfo.icon
          const target = Number(goal.targetAmount)
          const current = Number(goal.currentAmount)
          const progress = Math.min(100, Math.round((current / target) * 100))
          
          // Problem #37 - Visual state for expired goals
          const isExpired = new Date(goal.endDate) < new Date() && progress < 100

          return (
            <div 
              key={goal.id} 
              className={cn(
                "glass group p-8 rounded-[2.5rem] hover:-translate-y-2 transition-all duration-300 stagger-item border border-[var(--border-subtle)]",
                isExpired ? "border-red-500/40 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : typeInfo.border
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300", isExpired ? "bg-red-500/20 text-red-400" : typeInfo.color)}>
                    {isExpired ? <AlertTriangle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--fg-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">{goal.name}</h3>
                    <span className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">
                      {isExpired ? "Scaduto" : typeInfo.label}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(goal)} className="p-2 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--accent)] rounded-lg transition-colors border border-[var(--border-subtle)]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(goal)} disabled={isPending} className="p-2 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] rounded-lg transition-colors border border-[var(--border-subtle)]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest block">Stato Traguardo</span>
                      <span className="font-mono font-bold text-lg text-[var(--fg-primary)] tracking-tighter">€{current.toLocaleString('it-IT')} <span className="text-xs text-[var(--fg-muted)] font-medium">/ €{target.toLocaleString('it-IT')}</span></span>
                    </div>
                    <span className={cn("text-xl font-mono font-black", isExpired ? "text-red-400" : "text-[var(--fg-primary)]")}>{progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-input)] rounded-full h-3 overflow-hidden p-0.5 border border-[var(--border-subtle)]">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.2)]", isExpired ? "bg-red-500" : (progress >= 100 ? "bg-[var(--income)]" : typeInfo.bar))}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress >= 100 && (
                    <div className="flex items-center gap-2 mt-1">
                      <LottieAnimation animation="confetti" className="w-8 h-8" loop={false} />
                      <p className="text-[11px] font-bold text-[var(--income)] flex items-center gap-1">
                        🎯 Obiettivo raggiunto!
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-3">   
                    <span>Scadenza</span>
                    <span className={cn(isExpired && "text-red-400 font-black")}>{new Date(goal.endDate).toLocaleDateString('it-IT')}</span> 
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {goals.length === 0 && (
          <div className="col-span-full glass py-16 rounded-[3rem] border border-dashed flex flex-col items-center justify-center text-center">
            <LottieAnimation animation="catPlay" className="w-40 h-40" />
            <p className="text-[var(--fg-muted)] font-bold text-xl mt-2">Imposta il tuo primo obiettivo</p>
            <p className="text-[var(--fg-subtle)] text-sm max-w-xs mt-3">Definisci i tuoi target finanziari e ti aiuteremo a monitorarli.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="glass bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl w-full max-w-md border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <h2 className="text-xl font-display font-bold text-[var(--fg-primary)]">
                {editingGoal ? 'Modifica Obiettivo' : 'Nuovo Obiettivo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-2 hover:bg-[var(--bg-elevated)] rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome Obiettivo *</label>
                <input name="name" defaultValue={editingGoal?.name || ''} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-medium" placeholder="es. Fondo Emergenza" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Target (€) *</label>
                  <input name="targetAmount" type="number" step="0.01" defaultValue={editingGoal ? Number(editingGoal.targetAmount) : ''} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Già Accantonati (€)</label>
                  <input name="currentAmount" type="number" step="0.01" defaultValue={editingGoal ? Number(editingGoal.currentAmount) : 0} className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--accent)] font-mono font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Tipo</label>      
                <select name="type" defaultValue={editingGoal?.type || 'savings'} className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] appearance-none">
                  {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Data Inizio</label>
                  <input name="startDate" type="date" defaultValue={editingGoal ? new Date(editingGoal.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Data Fine</label>
                  <input 
                    name="endDate" 
                    type="date" 
                    defaultValue={editingGoal ? new Date(editingGoal.endDate).toISOString().split('T')[0] : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]} 
                    required 
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)]" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Conto Sorgente</label>
                <select name="accountId" defaultValue={editingGoal?.accountId || ''} className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] appearance-none">
                  <option value="">Nessuno (calcolo globale)</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              
              {error && <p className="text-[var(--expense)] text-xs font-bold uppercase">{error}</p>}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all border border-[var(--border-subtle)]">Annulla</button>
                <button type="submit" disabled={isPending} className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all disabled:opacity-50">
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingGoal ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
