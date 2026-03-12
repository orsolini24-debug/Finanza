'use client'

import { useState, useTransition, useMemo } from 'react'
import { Category } from '@prisma/client'
import { Tag, Plus, Trash2, Edit2, Check, X, Loader2, AlertCircle, Info, Copy } from 'lucide-react'
import { upsertBudget, deleteBudget, copyBudgetFromPreviousMonth } from '@/app/actions/budgets'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import QuickCategoryModal from '@/components/categories/QuickCategoryModal'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'
import LottieAnimation from '@/components/ui/LottieAnimation'

interface BudgetData {
  id: string
  category: Category
  amount: number
  spent: number
  remaining: number
  percentage: number
}

interface BudgetManagerProps {
  budgetData: BudgetData[]
  categories: Category[]
  month: string
}

export default function BudgetManager({ budgetData, categories, month }: BudgetManagerProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { confirm, open, handleConfirm, handleCancel, message } = useConfirm()
  
  // Form state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [showQuickCat, setShowQuickCat] = useState(false)
  const [localCategories, setLocalCategories] = useState<Category[]>([])

  const allCategories = useMemo(() => {
    const merged = [...categories]
    localCategories.forEach(lc => { if (!merged.find(c => c.id === lc.id)) merged.push(lc) })
    return merged
  }, [categories, localCategories])

  const availableCategories = allCategories.filter(
    cat => !budgetData.some(b => b.category.id === cat.id)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('categoryId', categoryId)
    formData.append('amount', amount)
    formData.append('month', month)

    startTransition(async () => {
      await upsertBudget(formData)
      setShowModal(false)
      setEditingId(null)
      setCategoryId('')
      setAmount('')
      router.refresh()
    })
  }

  const handleEdit = (budget: BudgetData) => {
    setEditingId(budget.id)
    setCategoryId(budget.category.id)
    setAmount(budget.amount.toString())
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!await confirm('Eliminare questo budget?')) return
    startTransition(async () => {
      await deleteBudget(id)
      toast.success('Budget eliminato')
      router.refresh()
    })
  }

  const totalBudget = budgetData.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0)
  const totalPercentage = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0

  const handleCopyFromPrev = async () => {
    if (isPending) return
    const workspaceId = budgetData.length > 0 ? budgetData[0].category.workspaceId : (categories.length > 0 ? categories[0].workspaceId : null)
    if (!workspaceId) return

    startTransition(async () => {
      try {
        const result = await copyBudgetFromPreviousMonth(workspaceId, month)
        if (result.copied > 0) {
          toast.success(`${result.copied} budget copiati dal mese precedente.`)
          router.refresh()
        } else {
          toast.info('Nessun budget trovato nel mese precedente.')
        }
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  return (
    <div className="space-y-10">
      <ConfirmDialog 
        open={open} 
        message={message} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />
      {/* Quick Category Modal */}
      {showQuickCat && (
        <QuickCategoryModal
          onClose={() => setShowQuickCat(false)}
          onSuccess={(newCatId) => {
            const tempCat = { id: newCatId, name: 'Nuova categoria', icon: null, type: 'BOTH', parentId: null, workspaceId: '', createdAt: new Date(), updatedAt: new Date() } as unknown as Category
            setLocalCategories(prev => [...prev, tempCat])
            setCategoryId(newCatId)
            setShowQuickCat(false)
            router.refresh()
          }}
        />
      )}

      {/* Riepilogo Aggregato */}
      {budgetData.length > 0 && (
        <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-[0.2em] mb-1">Riepilogo Mensile</p>
              <h2 className="text-3xl font-display font-black text-[var(--fg-primary)] tracking-tight">
                {formatCurrency(totalSpent)} <span className="text-lg text-[var(--fg-muted)] font-medium">di {formatCurrency(totalBudget)}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mb-1">Rimanente Totale</p>
              <p className={cn(
                "text-xl font-mono font-bold",
                totalBudget - totalSpent >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
              )}>
                {formatCurrency(totalBudget - totalSpent)}
              </p>
            </div>
          </div>
          <div className="w-full bg-[var(--bg-input)] rounded-full h-4 overflow-hidden p-1 border border-[var(--border-subtle)]">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                totalPercentage < 75 ? "bg-[var(--income)]" : totalPercentage < 100 ? "bg-[var(--warning)]" : "bg-[var(--expense)]"
              )}
              style={{ width: `${totalPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Miglioria 2: Categorie senza budget */}
      {availableCategories.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Info size={16} />
            </div>
            <p className="text-xs font-bold text-blue-400/80 uppercase tracking-wide">
              Hai <span className="text-blue-400 font-black">{availableCategories.length}</span> categorie senza un budget assegnato
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors border-b border-blue-400/30 hover:border-blue-300 pb-0.5"
          >
            Configura ora
          </button>
        </div>
      )}

      {/* Lista Budget */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-xs font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Budget per Categoria</h3>
          {!showModal && availableCategories.length > 0 && (
            <button 
              onClick={() => setShowModal(true)}
              className="text-[var(--accent)] text-xs font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Aggiungi Budget
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {budgetData.map((budget) => (
            <div key={budget.id} className="glass p-6 rounded-3xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[var(--bg-elevated)] rounded-xl text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition-colors">
                    <Tag size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--fg-primary)]">{budget.category.name}</h4>
                    <p className="text-[10px] text-[var(--fg-subtle)] font-bold uppercase tracking-wider">
                      {formatCurrency(budget.spent)} di {formatCurrency(budget.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black border",
                    budget.percentage < 75 ? "bg-[var(--income-dim)] text-[var(--income)] border-[var(--income)]/20" : 
                    budget.percentage < 100 ? "bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning)]/20" : 
                    "bg-[var(--expense-dim)] text-[var(--expense)] border-[var(--expense)]/20"
                  )}>
                    {Math.round(budget.percentage)}%
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(budget)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--expense)] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full bg-[var(--bg-input)] rounded-full h-2.5 overflow-hidden border border-[var(--border-subtle)]">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    budget.percentage < 75 ? "bg-[var(--income)]" : budget.percentage < 100 ? "bg-[var(--warning)]" : "bg-[var(--expense)]"
                  )}
                  style={{ width: `${budget.percentage}%` }}
                />
              </div>

              <div className="mt-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                {budget.remaining >= 0 ? (
                  <span className="text-[var(--fg-subtle)]">{formatCurrency(budget.remaining)} rimanenti</span>
                ) : (
                  <span className="text-[var(--expense)] flex items-center gap-1">
                    <AlertCircle size={10} /> Sforato di {formatCurrency(Math.abs(budget.remaining))}
                  </span>
                )}
              </div>
            </div>
          ))}

          {budgetData.length === 0 && !showModal && (
            <div className="glass p-8 rounded-[2rem] border border-dashed border-[var(--border-default)] text-center flex flex-col items-center">
              <LottieAnimation animation="piggyBank" className="w-36 h-36" />
              <p className="text-[var(--fg-muted)] font-medium mb-6">Nessun budget configurato per questo mese.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {availableCategories.length > 0 && (
                  <button 
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--accent)] text-[var(--accent-on)] px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-[0_0_20px_var(--glow-accent)] transition-all"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Crea il primo budget
                  </button>
                )}
                <button 
                  onClick={handleCopyFromPrev}
                  disabled={isPending}
                  className="bg-[var(--bg-elevated)] text-[var(--fg-primary)] border border-[var(--border-subtle)] px-6 py-3 rounded-xl font-bold text-sm hover:bg-[var(--bg-elevated)]/80 transition-all disabled:opacity-50"
                >
                  <Copy size={16} className="inline mr-2" />
                  Copia dal mese precedente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Form Add & Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl w-full max-w-md border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95">
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">
                {editingId ? 'Modifica Budget' : 'Nuovo Budget'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-3 hover:bg-[var(--bg-elevated)] rounded-2xl">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Categoria *</label>
                  {!editingId && (
                    <button type="button" onClick={() => setShowQuickCat(true)}
                      className="flex items-center gap-1 text-[9px] font-black uppercase text-[var(--accent)] hover:underline tracking-widest">
                      <Plus size={10} /> Nuova
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    disabled={!!editingId}
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-medium appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Seleziona...</option>
                    {editingId ? (
                      <option value={categoryId}>{budgetData.find(b => b.id === editingId)?.category.name}</option>
                    ) : (
                      availableCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Importo Mensile (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-mono font-bold text-lg"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all">Annulla</button>
                <button type="submit" disabled={isPending || !categoryId || !amount} className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all disabled:opacity-50">
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingId ? 'Salva Modifiche' : 'Aggiungi Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
