'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { RecurringItem, Category, Account } from '@prisma/client'
import { Plus, RefreshCw, Trash2, Edit2, Check, X, Loader2, Calendar, Tag, Wallet, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, Calculator } from 'lucide-react'
import { createRecurringItem, updateRecurringItem, deleteRecurringItem, executeRecurring } from '@/app/actions/recurring'
import { useRouter } from 'next/navigation'
import { cn, filterCategoriesByType } from '@/lib/utils'
import QuickCategoryModal from '@/components/categories/QuickCategoryModal'

function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface RecurringWithRelations extends RecurringItem {
  category: Category | null
  account: Account | null
}

interface RecurringManagerProps {
  items: RecurringWithRelations[]
  categories: Category[]
  accounts: Account[]
}

const CADENCE_LABELS: Record<string, string> = {
  weekly: 'Settimanale',
  monthly: 'Mensile',
  yearly: 'Annuale',
}

export default function RecurringManager({ items, categories, accounts }: RecurringManagerProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringWithRelations | null>(null)
  const [isIncome, setIsIncome] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [showQuickCat, setShowQuickCat] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [localCategories, setLocalCategories] = useState<Category[]>([])

  // Campi controllati per calcolo automatico endDate
  const [amountVal, setAmountVal] = useState('')
  const [totalAmountVal, setTotalAmountVal] = useState('')
  const [cadenceVal, setCadenceVal] = useState('monthly')
  const [nextDateVal, setNextDateVal] = useState(toLocalDate(new Date()))
  const [endDateVal, setEndDateVal] = useState('')

  const allCategories = useMemo(() => {
    const merged = [...categories]
    localCategories.forEach(lc => { if (!merged.find(c => c.id === lc.id)) merged.push(lc) })
    return merged
  }, [categories, localCategories])
  const filteredCategories = filterCategoriesByType(allCategories, isIncome)

  // Calcolo occorrenze e data fine automatica
  const occurrences = useMemo(() => {
    const single = parseFloat(amountVal)
    const total = parseFloat(totalAmountVal)
    if (!single || !total || single <= 0 || total <= 0) return null
    return Math.round(total / single)
  }, [amountVal, totalAmountVal])

  useEffect(() => {
    if (!occurrences || occurrences < 1 || !nextDateVal) return
    const start = new Date(nextDateVal)
    if (isNaN(start.getTime())) return
    const end = new Date(start)
    if (cadenceVal === 'weekly') end.setDate(end.getDate() + (occurrences - 1) * 7)
    else if (cadenceVal === 'monthly') end.setMonth(end.getMonth() + (occurrences - 1))
    else if (cadenceVal === 'yearly') end.setFullYear(end.getFullYear() + (occurrences - 1))
    setEndDateVal(toLocalDate(end))
  }, [occurrences, nextDateVal, cadenceVal])

  // Reset form quando apre/chiude modal
  useEffect(() => {
    if (showModal) {
      setAmountVal(editingItem ? String(Number(editingItem.amount)) : '')
      setTotalAmountVal('')
      setCadenceVal(editingItem?.cadence || 'monthly')
      setNextDateVal(editingItem ? toLocalDate(new Date(editingItem.nextDate)) : toLocalDate(new Date()))
      setEndDateVal((editingItem as any)?.endDate ? toLocalDate(new Date((editingItem as any).endDate)) : '')
      setSelectedCategoryId(editingItem?.categoryId || '')
      setLocalCategories([])
    }
  }, [showModal, editingItem])

  const upcomingItems = items
    .filter(item => {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      return new Date(item.nextDate) <= thirtyDaysFromNow
    })
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())

  const openCreate = () => {
    setEditingItem(null)
    setIsIncome(false)
    setShowModal(true)
  }

  const openEdit = (item: RecurringWithRelations) => {
    setEditingItem(item)
    setIsIncome(item.isIncome)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('isIncome', isIncome.toString())
    
    startTransition(async () => {
      try {
        if (editingItem) {
          await updateRecurringItem(editingItem.id, formData)
        } else {
          await createRecurringItem(formData)
        }
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Eliminare questa ricorrenza?')) return
    startTransition(async () => {
      await deleteRecurringItem(id)
      router.refresh()
    })
  }

  const handleExecute = (id: string) => {
    setExecutingId(id)
    startTransition(async () => {
      try {
        await executeRecurring(id)
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      } finally {
        setExecutingId(null)
      }
    })
  }

  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

  return (
    <div className="space-y-12">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-3 rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all font-bold text-sm"
        >
          <Plus size={18} />
          Nuova Ricorrenza
        </button>
      </div>

      {/* Prossimi 30 giorni */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Clock className="text-[var(--accent)]" size={20} />
          <h2 className="text-xl font-display font-bold text-[var(--fg-primary)]">In scadenza (prossimi 30gg)</h2>
        </div>
        
        <div className="grid gap-3">
          {upcomingItems.map((item) => {
            const isOverdue = new Date(item.nextDate) < new Date()
            return (
              <div key={item.id} className="glass p-4 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--border-default)] transition-all">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "flex flex-col items-center justify-center min-w-[60px] py-2 rounded-xl border font-bold uppercase",
                    isOverdue ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-[var(--accent-dim)] border-[var(--accent)]/20 text-[var(--accent)]"
                  )}>
                    <span className="text-[9px]">{new Date(item.nextDate).toLocaleDateString('it-IT', { month: 'short' })}</span>
                    <span className="text-lg leading-none">{new Date(item.nextDate).getDate()}</span>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-[var(--fg-primary)]">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">{CADENCE_LABELS[item.cadence]}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                      <span className="text-[10px] font-medium text-[var(--fg-muted)]">{item.category?.name || 'Senza categoria'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className={cn(
                      "font-mono font-bold text-base",
                      item.isIncome ? "text-[var(--income)]" : "text-[var(--expense)]"
                    )}>
                      {item.isIncome ? '+' : '-'}{fmt(Number(item.amount))}
                    </p>
                    {isOverdue && <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">SCADUTO</span>}
                  {!isOverdue && (item as any).endDate && (() => {
                    const end = new Date((item as any).endDate);
                    const soon = new Date(); soon.setDate(soon.getDate() + 30);
                    return end <= soon ? <span className="text-[9px] font-black text-yellow-400 uppercase tracking-tighter bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">ULTIMA</span> : null;
                  })()}
                  </div>
                  
                  <button 
                    onClick={() => handleExecute(item.id)}
                    disabled={isPending}
                    className="p-2.5 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    title="Registra transazione ora"
                  >
                    {executingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  </button>
                </div>
              </div>
            )
          })}
          {upcomingItems.length === 0 && (
            <div className="glass p-10 rounded-3xl border border-dashed border-[var(--border-default)] text-center">
              <p className="text-[var(--fg-muted)] font-medium">Nessuna operazione ricorrente prevista a breve.</p>
            </div>
          )}
        </div>
      </section>

      {/* Tutte le ricorrenze */}
      <section className="space-y-6 pb-20">
        <h2 className="text-xl font-display font-bold text-[var(--fg-primary)] px-2">Tutte le Ricorrenze</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="glass p-6 rounded-[2.5rem] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-500 group">
              <div className="flex items-start justify-between mb-6">
                <div className={cn(
                  "p-3 rounded-2xl",
                  item.isIncome ? "bg-[var(--income-dim)] text-[var(--income)]" : "bg-[var(--expense-dim)] text-[var(--expense)]"
                )}>
                  {item.isIncome ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--expense)] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--fg-primary)] line-clamp-1">{item.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="text-[9px] font-black uppercase bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)] text-[var(--fg-subtle)]">
                    {CADENCE_LABELS[item.cadence]}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--fg-muted)] font-medium">Importo</span>
                  <span className={cn(
                    "font-mono font-bold",
                    item.isIncome ? "text-[var(--income)]" : "text-[var(--expense)]"
                  )}>
                    {item.isIncome ? '+' : '-'}{fmt(Number(item.amount))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--fg-muted)] font-medium">Prossima</span>
                  <span className="font-bold text-[var(--fg-primary)]">
                    {new Date(item.nextDate).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {(item as any).endDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--fg-muted)] font-medium">Fine il</span>
                    <span className="font-bold text-[var(--warning)]">
                      {new Date((item as any).endDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleExecute(item.id)}
                disabled={isPending}
                className="mt-6 w-full py-3 bg-[var(--bg-elevated)] text-[var(--fg-primary)] rounded-2xl font-bold text-xs hover:bg-[var(--accent)] hover:text-[var(--accent-on)] transition-all flex items-center justify-center gap-2 border border-[var(--border-subtle)]"
              >
                {executingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Registra ora
              </button>
            </div>
          ))}
        </div>
        
        {items.length === 0 && (
          <div className="glass p-20 rounded-[3rem] border border-dashed border-[var(--border-default)] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-6">
              <RefreshCw size={40} className="text-[var(--fg-subtle)] opacity-50" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)] mb-2">Nessuna ricorrenza</h2>
            <p className="text-[var(--fg-muted)] max-w-sm mb-8 font-medium">Configura i tuoi pagamenti fissi o entrate regolari per automatizzare la gestione.</p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-8 py-3 rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all font-bold"
            >
              Crea la prima ricorrenza
            </button>
          </div>
        )}
      </section>

      {/* Quick Category Modal */}
      {showQuickCat && (
        <QuickCategoryModal
          onClose={() => setShowQuickCat(false)}
          onSuccess={(newCatId) => {
            // Segnaposto locale finché router.refresh() non carica la categoria reale
            const tempCat = { id: newCatId, name: 'Nuova categoria', icon: null, type: 'BOTH', parentId: null, workspaceId: '', createdAt: new Date(), updatedAt: new Date() } as unknown as Category
            setLocalCategories(prev => [...prev, tempCat])
            setSelectedCategoryId(newCatId)
            setShowQuickCat(false)
            router.refresh()
          }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl w-full max-w-lg border border-[var(--border-default)] flex flex-col max-h-[90dvh] animate-in zoom-in-95">
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex-shrink-0">
              <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">
                {editingItem ? 'Modifica Ricorrenza' : 'Nuova Ricorrenza'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-3 hover:bg-[var(--bg-elevated)] rounded-2xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome *</label>
                <input name="name" defaultValue={editingItem?.name || ''} required className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-medium" placeholder="es. Netflix" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Importo rata (€) *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={amountVal}
                    onChange={e => setAmountVal(e.target.value)}
                    required
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Tipo *</label>
                  <div className="flex p-1 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)] h-[58px]">
                    <button
                      type="button"
                      onClick={() => setIsIncome(false)}
                      className={cn(
                        "flex-1 rounded-xl text-[10px] font-black uppercase transition-all",
                        !isIncome ? "bg-[var(--expense)] text-white shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                      )}
                    >
                      Uscita
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsIncome(true)}
                      className={cn(
                        "flex-1 rounded-xl text-[10px] font-black uppercase transition-all",
                        isIncome ? "bg-[var(--income)] text-[var(--accent-on)] shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                      )}
                    >
                      Entrata
                    </button>
                  </div>
                </div>
              </div>

              {/* Importo totale — calcola automaticamente la data fine */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calculator size={10} />
                  Importo totale (€) <span className="normal-case font-medium text-[var(--fg-muted)]">— opzionale, calcola la data fine automaticamente</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={totalAmountVal}
                  onChange={e => setTotalAmountVal(e.target.value)}
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-mono"
                  placeholder="es. 1200 → 12 rate da €100"
                />
                {occurrences && occurrences > 0 && (
                  <p className="text-[10px] text-[var(--accent)] font-bold ml-1">
                    → {occurrences} {occurrences === 1 ? 'rata' : 'rate'} · Fine il {new Date(endDateVal).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Cadenza *</label>
                  <select
                    name="cadence"
                    value={cadenceVal}
                    onChange={e => setCadenceVal(e.target.value)}
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] font-medium appearance-none"
                  >
                    <option value="weekly">Ogni Settimana</option>
                    <option value="monthly">Ogni Mese</option>
                    <option value="yearly">Ogni Anno</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Prima data *</label>
                  <input
                    name="nextDate"
                    type="date"
                    value={nextDateVal}
                    onChange={e => setNextDateVal(e.target.value)}
                    required
                    className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                  Data fine <span className="normal-case font-medium text-[var(--fg-muted)]">(opzionale — calcolata automaticamente se inserisci l'importo totale)</span>
                </label>
                <input
                  name="endDate"
                  type="date"
                  value={endDateVal}
                  onChange={e => { setEndDateVal(e.target.value); setTotalAmountVal('') }}
                  className="w-full px-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCat(true)}
                      className="flex items-center gap-1 text-[9px] font-black uppercase text-[var(--accent)] hover:underline tracking-widest"
                      title="Crea nuova categoria"
                    >
                      <Plus size={10} /> Nuova
                    </button>
                  </div>
                  <select
                    name="categoryId"
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] appearance-none"
                  >
                    <option value="">Senza categoria</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Conto *</label>
                  <select name="accountId" defaultValue={editingItem?.accountId || ''} required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-[var(--fg-primary)] appearance-none">
                    <option value="">Seleziona...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all border border-[var(--border-subtle)]">Annulla</button>
                <button type="submit" disabled={isPending} className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all disabled:opacity-50">
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingItem ? 'Salva Modifiche' : 'Crea Ricorrenza'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
