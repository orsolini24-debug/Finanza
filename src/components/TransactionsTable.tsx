'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Transaction, Category, Account } from '@prisma/client'
import { Search, Filter, Check, X, Trash2, Tags, ChevronDown, CheckCircle2, AlertCircle, Edit2, Loader2, Download, Sparkles, Clock, ArrowRightLeft } from 'lucide-react'
import { confirmTransactions, deleteTransactions, setTransactionCategory } from '@/app/actions/transactions'
import { aiSuggestCategories } from '@/app/actions/ai-categorize'
import { unlinkTransfer, confirmTransferPair } from '@/app/actions/transfers'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import TransactionEditModal from './transactions/TransactionEditModal'
import QuickCategoryModal from './categories/QuickCategoryModal'
import TransferModal from './transfers/TransferModal'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import LottieAnimation from '@/components/ui/LottieAnimation'

type TransactionWithRelations = Transaction & {
  category: Category | null;
  account: Account;
}

interface TransactionsTableProps {
  transactions: TransactionWithRelations[];
  categories: Category[];
  accounts: Account[];
  defaultStatus?: 'ALL' | 'STAGED' | 'CONFIRMED';
}

export default function TransactionsTable({ transactions, categories, accounts, defaultStatus = 'ALL' }: TransactionsTableProps) {
  const [selectedTx, setSelectedTx] = useState<string[]>([])
  const [editingTx, setEditingTx] = useState<TransactionWithRelations | null>(null)
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{ transactionId: string; categoryId: string | null; categoryName: string | null; confidence: number; accepted: boolean }[]>([])
  const [showAiPanel, setShowAiPanel] = useState(false)
  const router = useRouter()

  // Tabs
  const stagedCount    = transactions.filter(t => t.status === 'STAGED').length
  const confirmedCount = transactions.filter(t => t.status === 'CONFIRMED').length

  // Filters
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'STAGED' | 'CONFIRMED'>(defaultStatus)
  const [filterType, setFilterType] = useState<'ALL' | 'income' | 'expense'>('ALL')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL')

  const incomeCategories = categories.filter(c => c.type === 'INCOME')
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')
  const bothCategories = categories.filter(c => c.type === 'BOTH')

  useEffect(() => {
    setSelectedTx([])
  }, [filterStatus, filterType, filterCategoryId, search])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false
      if (filterType === 'income' && Number(tx.amount) <= 0) return false
      if (filterType === 'expense' && Number(tx.amount) >= 0) return false
      if (filterCategoryId !== 'ALL' && tx.categoryId !== filterCategoryId) return false
      return true
    })
  }, [transactions, search, filterStatus, filterType, filterCategoryId])

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, { txs: TransactionWithRelations[], net: number }>()
    filtered.forEach(tx => {
      const dateKey = tx.date.toISOString().split('T')[0]
      if (!groups.has(dateKey)) groups.set(dateKey, { txs: [], net: 0 })
      const group = groups.get(dateKey)!
      group.txs.push(tx)
      group.net += Number(tx.amount)
    })
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const toggleSelect = (id: string) => {
    setSelectedTx(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectDay = (dayTxIds: string[]) => {
    const allSelected = dayTxIds.every(id => selectedTx.includes(id))
    if (allSelected) {
      setSelectedTx(prev => prev.filter(id => !dayTxIds.includes(id)))
    } else {
      setSelectedTx(prev => [...new Set([...prev, ...dayTxIds])])
    }
  }

  const toggleSelectAll = () => {
    if (selectedTx.length === filtered.length) {
      setSelectedTx([])
    } else {
      setSelectedTx(filtered.map(t => t.id))
    }
  }

  const handleConfirm = () => {
    if (isPending) return
    startTransition(async () => {
      try {
        await confirmTransactions(selectedTx)
        setSelectedTx([])
        router.refresh()
        toast.success("Transazioni confermate")
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleConfirmedDelete = () => {
    setConfirmOpen(false)
    if (isPending) return
    startTransition(async () => {
      try {
        await deleteTransactions(selectedTx)
        setSelectedTx([])
        router.refresh()
        toast.success("Transazioni eliminate")
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleDelete = () => {
    if (isPending) return
    setConfirmOpen(true)
  }

  const handleUnlinkTransfer = (txId: string) => {
    if (isPending) return
    startTransition(async () => {
      try {
        await unlinkTransfer(txId)
        router.refresh()
        toast.success("Trasferimento scollegato")
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleConfirmTransferPair = (txId: string) => {
    if (isPending) return
    startTransition(async () => {
      try {
        await confirmTransferPair(txId)
        router.refresh()
        toast.success("Trasferimento confermato")
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleChangeCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'Cambia Categoria' || isPending) return
    
    if (val === 'new_category') {
      setShowQuickCategoryModal(true)
      e.target.value = 'Cambia Categoria'
      return
    }

    const categoryId = val === 'none' ? null : val
    startTransition(async () => {
      try {
        await setTransactionCategory(selectedTx, categoryId)
        // Keep selectedTx to allow immediate confirmation
        router.refresh()
        toast.success("Categoria aggiornata")
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleAiCategorize = async () => {
    if (isAiLoading || isPending) return
    const idsToProcess = selectedTx.length > 0 ? selectedTx : filtered.filter(t => t.status === 'STAGED').map(t => t.id)
    if (idsToProcess.length === 0) return toast.error("Nessuna transazione in attesa.")
    if (idsToProcess.length > 100) return toast.error("Seleziona massimo 100 transazioni alla volta.")

    setIsAiLoading(true)
    try {
      const suggestions = await aiSuggestCategories(idsToProcess)
      setAiSuggestions(suggestions.map(s => ({ ...s, accepted: s.confidence >= 0.7 })))
      setShowAiPanel(true)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleAcceptAiSuggestions = () => {
    const toApply = aiSuggestions.filter(s => s.accepted && s.categoryId)
    if (toApply.length === 0) return setShowAiPanel(false)

    startTransition(async () => {
      try {
        const byCategory = toApply.reduce((acc, s) => {
          if (!acc[s.categoryId!]) acc[s.categoryId!] = []
          acc[s.categoryId!].push(s.transactionId)
          return acc
        }, {} as Record<string, string[]>)

        for (const [catId, ids] of Object.entries(byCategory)) {
          await setTransactionCategory(ids, catId)
        }
        setShowAiPanel(false)
        setAiSuggestions([])
        // Keep selection if they were selected before
        router.refresh()
        toast.success("Categorie AI applicate")
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const activeFiltersCount = [filterStatus !== 'ALL', filterType !== 'ALL', filterCategoryId !== 'ALL'].filter(Boolean).length

  const exportToCSV = () => {
    const rows = filtered.map(tx => ({
      Data: new Date(tx.date).toLocaleDateString('it-IT'),
      Descrizione: tx.description,
      Importo: Number(tx.amount).toFixed(2),
      Categoria: tx.category?.name || '',
      Stato: tx.status === 'CONFIRMED' ? 'Confermata' : 'In attesa',
    }))
    const headers = ['Data', 'Descrizione', 'Importo', 'Categoria', 'Stato']
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transazioni-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Tab STAGED / CONFIRMED */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
          {[
            { id: 'ALL' as const, label: 'Tutte', count: transactions.length, icon: undefined as any },
            { id: 'STAGED' as const, label: 'Da confermare', count: stagedCount, icon: Clock },
            { id: 'CONFIRMED' as const, label: 'Registrate', count: confirmedCount, icon: CheckCircle2 },
          ].map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setFilterStatus(id); setSelectedTx([]) }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                filterStatus === id ? "shadow-sm bg-[var(--bg-surface)]" : "hover:bg-[var(--bg-surface)] text-[var(--fg-muted)]"
              )}
              style={{
                color: filterStatus === id
                  ? id === 'STAGED' ? 'var(--warning)' : id === 'CONFIRMED' ? 'var(--income)' : 'var(--fg-primary)'
                  : undefined,
              }}
            >
              {Icon && <Icon size={12} />}
              {label}
              {count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-black",
                  filterStatus === id
                    ? id === 'STAGED' ? "bg-[var(--warning-dim)] text-[var(--warning)]"
                    : id === 'CONFIRMED' ? "bg-[var(--income-dim)] text-[var(--income)]"
                    : "bg-[var(--accent-dim)] text-[var(--accent)]"
                    : "bg-[var(--border-subtle)] text-[var(--fg-subtle)]"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        {filterStatus === 'STAGED' && stagedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--warning-dim)] text-[var(--warning)]">
            <AlertCircle size={13} />
            {stagedCount} transazion{stagedCount === 1 ? 'e' : 'i'} in attesa — selezionale e usa "Conferma"
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] w-4 h-4 group-focus-within:text-[var(--accent)] transition-colors" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca descrizione..." className="pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm w-full md:w-80 transition-all" />
          </div>
          <button onClick={() => setShowFilter(f => !f)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold", (showFilter || activeFiltersCount > 0) ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--fg-muted)]")}>
            <Filter className="w-4 h-4" /> Filtra{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all">
            <Download size={14} /> Esporta CSV
          </button>
        </div>
        {filtered.length > 0 && (
          <button onClick={toggleSelectAll} className="text-xs font-bold text-[var(--accent)] hover:underline px-2">
            {selectedTx.length === filtered.length ? 'Deseleziona tutto' : 'Seleziona tutti i risultati'}
          </button>
        )}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 items-stretch sm:items-end glass">
              <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Stato</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-sm">
                  <option value="ALL">Tutti gli stati</option>
                  <option value="STAGED">In attesa</option>
                  <option value="CONFIRMED">Confermati</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Tipo</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-sm">
                  <option value="ALL">Tutti i tipi</option>
                  <option value="income">Solo Entrate</option>
                  <option value="expense">Solo Uscite</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Categoria</label>
                <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-sm">
                  <option value="ALL">Tutte le categorie</option>
                  <option value="">Non categorizzato</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={() => { setFilterStatus('ALL'); setFilterType('ALL'); setFilterCategoryId('ALL'); setSearch('') }} className="px-4 py-2 text-sm font-bold text-[var(--expense)]">Resetta</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestion Panel */}
      <AnimatePresence>
        {showAiPanel && aiSuggestions.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden">
            <div className="glass p-6 rounded-[2rem] border border-[var(--accent)]/30 bg-[var(--accent-dim)]/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl shadow-lg"><Sparkles size={18} /></div>
                  <h3 className="text-sm font-black text-[var(--fg-primary)] uppercase tracking-widest text-left">Suggerimenti AI Groq ({aiSuggestions.length})</h3>
                </div>
                <button onClick={() => setShowAiPanel(false)} className="p-2 text-[var(--fg-muted)]"><X size={18} /></button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {aiSuggestions.map((s, idx) => {
                  const tx = transactions.find(t => t.id === s.transactionId)
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-surface)]/50 rounded-2xl border border-[var(--border-subtle)]">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input type="checkbox" checked={s.accepted} onChange={() => setAiSuggestions(prev => prev.map((p, i) => i === idx ? { ...p, accepted: !p.accepted } : p))} className="w-4 h-4 accent-[var(--accent)]" />
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold truncate">{tx?.description}</p>
                          <p className="text-[10px] text-[var(--accent)] font-black uppercase">→ {s.categoryName || '?'}</p>
                        </div>
                      </div>
                      <div className="text-[10px] font-black px-2 py-1 rounded-lg border border-[var(--accent)]/20 text-[var(--accent)]">{Math.round(s.confidence * 100)}%</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={handleAcceptAiSuggestions} disabled={isPending} className="flex-1 py-3 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Applica ${aiSuggestions.filter(s => s.accepted).length} suggerimenti`}
                </button>
                <button onClick={() => setAiSuggestions(prev => prev.map(p => ({ ...p, accepted: true })))} className="px-4 py-3 bg-[var(--bg-elevated)] text-[var(--fg-muted)] rounded-xl font-bold text-[10px] uppercase">Tutti</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {groupedTransactions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-2 text-center"
        >
          <LottieAnimation animation="empty" className="w-48 h-48" />
          <p className="text-sm font-bold text-[var(--fg-muted)] uppercase tracking-widest mt-2">Nessuna transazione trovata</p>
          <p className="text-xs text-[var(--fg-subtle)]">Prova a cambiare i filtri o aggiungi una nuova transazione</p>
        </motion.div>
      )}

      {/* Grouped List */}
      <div className="space-y-8">
        {groupedTransactions.map(([date, { txs, net }]) => {
          const dayTxIds = txs.map(t => t.id)
          const allDaySelected = dayTxIds.length > 0 && dayTxIds.every(id => selectedTx.includes(id))
          const someDaySelected = dayTxIds.some(id => selectedTx.includes(id))
          return (
          <div key={date} className="space-y-2">
            <div className="flex items-center justify-between px-3 sm:px-6 py-2 bg-[var(--bg-elevated)]/40 rounded-2xl border border-[var(--border-subtle)] text-left">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allDaySelected}
                  ref={el => { if (el) el.indeterminate = someDaySelected && !allDaySelected }}
                  onChange={() => toggleSelectDay(dayTxIds)}
                  className="w-4 h-4 rounded-md accent-[var(--accent)] cursor-pointer"
                  title="Seleziona/deseleziona il giorno"
                />
                <span className="text-xs font-black text-[var(--fg-primary)] uppercase tracking-widest">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <span className={cn("text-xs font-mono font-bold", net >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]")}>{net > 0 ? '+' : ''}{formatCurrency(net)}</span>
            </div>
            <div className="glass rounded-[2rem] overflow-hidden border border-[var(--border-subtle)] shadow-sm">
              <div className="divide-y divide-[var(--border-subtle)]">
                {txs.map((tx) => (
                  <div key={tx.id} className={cn("group flex items-center justify-between p-4 transition-all", selectedTx.includes(tx.id) ? "bg-[var(--accent-dim)]/5" : "hover:bg-[var(--bg-elevated)]/30")}>
                    <div className="flex items-center gap-4 text-left">
                      <input type="checkbox" checked={selectedTx.includes(tx.id)} onChange={() => toggleSelect(tx.id)} className="w-4 h-4 rounded-md accent-[var(--accent)] cursor-pointer" />
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs bg-[var(--bg-elevated)]")}>{tx.category?.name?.[0] || '?'}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate max-w-[200px]">{tx.description}</p>
                          <button onClick={() => setEditingTx(tx)} className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--fg-subtle)]"><Edit2 size={12} /></button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.isTransfer ? (
                            <span className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase flex items-center gap-1" title="Trasferimento tra conti — escluso da entrate/uscite">
                              ↔ Trasferimento
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase">
                              {tx.category?.name || 'Senza categoria'}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-[var(--fg-subtle)] uppercase">{tx.account.name}</span>
                          {tx.status === 'STAGED' && <span className="text-[9px] font-black text-[var(--warning)] uppercase bg-[var(--warning-dim)] px-1.5 py-0.5 rounded-md">In attesa</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {tx.isTransfer && tx.status === 'STAGED' && <button onClick={() => handleConfirmTransferPair(tx.id)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><CheckCircle2 size={14} /></button>}
                      <span className={cn("font-mono font-bold text-base", Number(tx.amount) < 0 ? "text-[var(--expense)]" : "text-[var(--income)]")}>{Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editingTx && <TransactionEditModal transaction={editingTx} categories={categories} accounts={accounts} onClose={() => setEditingTx(null)} />}

      {/* Quick Category Modal */}
      <AnimatePresence>
        {showQuickCategoryModal && (
          <QuickCategoryModal 
            onClose={() => setShowQuickCategoryModal(false)}
            onSuccess={(newId) => {
              setShowQuickCategoryModal(false)
              // If we have selected transactions, apply the new category automatically
              if (selectedTx.length > 0 && newId) {
                startTransition(async () => {
                  await setTransactionCategory(selectedTx, newId)
                  router.refresh()
                })
              } else {
                router.refresh()
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal accounts={accounts} onClose={() => setShowTransferModal(false)} onSuccess={() => router.refresh()} />
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedTx.length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 bottom-6">
            <div className="glass p-4 rounded-[2.5rem] shadow-2xl border border-[var(--border-default)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-2">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--accent-on)] font-bold shadow-lg">{selectedTx.length}</div>
                <div className="hidden sm:block text-left"><p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Batch Action</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--fg-primary)] hover:bg-[var(--bg-surface)] transition-all">
                  <ArrowRightLeft size={14} /> <span className="hidden md:inline">Trasferimento</span>
                </button>
                <button onClick={handleAiCategorize} disabled={isAiLoading || isPending} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-elevated)] text-[var(--accent)] rounded-xl font-bold text-xs uppercase transition-all">
                  {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span className="hidden md:inline">AI (Max 100)</span>
                </button>
                <div className="relative group">
                  <Tags className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--accent)] w-3.5 h-3.5 pointer-events-none" />
                  <select onChange={handleChangeCategory} className="pl-8 pr-8 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs font-bold focus:outline-none appearance-none cursor-pointer max-w-[140px] sm:max-w-none">
                    <option>Cambia Categoria</option>
                    <option value="new_category" className="text-[var(--accent)] font-black">+ Nuova Categoria...</option>
                    <option disabled>──────────</option>
                    {bothCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="none">— Rimuovi Categoria —</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] w-3 h-3 pointer-events-none" />
                </div>
                <button onClick={handleConfirm} disabled={isPending} className="px-5 py-2.5 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl font-bold text-xs uppercase shadow-lg hover:shadow-[var(--accent-dim)] transition-all">Conferma</button>
                <button onClick={handleDelete} disabled={isPending} className="p-2.5 bg-[var(--expense-dim)] text-[var(--expense)] rounded-xl hover:bg-[var(--expense)] hover:text-white transition-all"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedTx([])} className="p-2.5 text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] rounded-xl"><X size={18} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        open={confirmOpen} 
        message={`Eliminare ${selectedTx.length} transazion${selectedTx.length === 1 ? 'e' : 'i'}?`} 
        onConfirm={handleConfirmedDelete} 
        onCancel={() => setConfirmOpen(false)} 
      />
    </div>
  )
}
