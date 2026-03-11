'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Transaction, Category, Account, TxStatus } from '@prisma/client'
import { Search, Filter, Check, X, Trash2, Tags, ChevronDown, CheckCircle2, AlertCircle, Edit2, Loader2, Download } from 'lucide-react'
import { confirmTransactions, deleteTransactions, setTransactionCategory } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import TransactionEditModal from './transactions/TransactionEditModal'

type TransactionWithRelations = Transaction & {
  category: Category | null;
  account: Account;
}

interface TransactionsTableProps {
  transactions: TransactionWithRelations[];
  categories: Category[];
  accounts: Account[];
}

export default function TransactionsTable({ transactions, categories, accounts }: TransactionsTableProps) {
  const [selectedTx, setSelectedTx] = useState<string[]>([])
  const [editingTx, setEditingTx] = useState<TransactionWithRelations | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Filters
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'STAGED' | 'CONFIRMED'>('ALL')
  const [filterType, setFilterType] = useState<'ALL' | 'income' | 'expense'>('ALL')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL')

  const incomeCategories = categories.filter(c => c.type === 'INCOME')
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')
  const bothCategories = categories.filter(c => c.type === 'BOTH')

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false
      // Problem #6 - Fix filter logic: ensure status matches exactly
      if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false
      if (filterType === 'income' && Number(tx.amount) <= 0) return false
      if (filterType === 'expense' && Number(tx.amount) >= 0) return false
      if (filterCategoryId !== 'ALL' && tx.categoryId !== filterCategoryId) return false
      return true
    })
  }, [transactions, search, filterStatus, filterType, filterCategoryId])

  // Grouping by date
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, { txs: TransactionWithRelations[], net: number }>()
    
    filtered.forEach(tx => {
      const dateKey = tx.date.toISOString().split('T')[0]
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { txs: [], net: 0 })
      }
      const group = groups.get(dateKey)!
      group.txs.push(tx)
      group.net += Number(tx.amount)
    })

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const toggleSelect = (id: string) => {
    setSelectedTx(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedTx.length === filtered.length) {
      setSelectedTx([])
    } else {
      setSelectedTx(filtered.map(t => t.id))
    }
  }

  const handleConfirm = () => {
    if (isPending) return; // Problem #3 - guard
    startTransition(async () => {
      try {
        await confirmTransactions(selectedTx)
        setSelectedTx([])
        router.refresh()
      } catch (e: any) {
        alert(e.message)
      }
    })
  }

  const handleDelete = () => {
    if (isPending) return;
    if (confirm(`Eliminare ${selectedTx.length} transazioni? L'azione non può essere annullata.`)) {
      startTransition(async () => {
        try {
          await deleteTransactions(selectedTx)
          setSelectedTx([])
          router.refresh()
        } catch (e: any) {
          alert(e.message)
        }
      })
    }
  }

  const handleChangeCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Cambia Categoria' || isPending) return;
    
    const categoryId = val === 'none' ? null : val
    startTransition(async () => {
      try {
        await setTransactionCategory(selectedTx, categoryId)
        setSelectedTx([])
        router.refresh()
      } catch (e: any) {
        alert(e.message)
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
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))
    ].join('\n')
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
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] w-4 h-4 group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca descrizione..."
              className="pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-sm w-full md:w-80 transition-all placeholder:text-[var(--fg-subtle)]"
            />
          </div>
          <button
            onClick={() => setShowFilter(f => !f)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold",
              showFilter || activeFiltersCount > 0 
                ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]" 
                : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)]"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filtra{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", showFilter ? "rotate-180" : "")} />
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:border-[var(--border-default)] transition-all"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
        </div>
        
        {filtered.length > 0 && (
          <button 
            onClick={toggleSelectAll}
            className="text-xs font-bold text-[var(--accent)] hover:underline px-2"
          >
            {selectedTx.length === filtered.length ? 'Deseleziona tutto' : 'Seleziona tutti i risultati'}
          </button>
        )}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 items-stretch sm:items-end glass">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Stato</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-full sm:min-w-[140px]"
                >
                  <option value="ALL">Tutti gli stati</option>
                  <option value="STAGED">In attesa</option>
                  <option value="CONFIRMED">Confermati</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Tipo</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-full sm:min-w-[140px]"
                >
                  <option value="ALL">Tutti i tipi</option>
                  <option value="income">Solo Entrate</option>
                  <option value="expense">Solo Uscite</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Categoria</label>
                <select
                  value={filterCategoryId}
                  onChange={e => setFilterCategoryId(e.target.value)}
                  className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-full sm:min-w-[180px]"
                >
                  <option value="ALL">Tutte le categorie</option>
                  <option value="">Non categorizzato</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => { setFilterStatus('ALL'); setFilterType('ALL'); setFilterCategoryId('ALL'); setSearch('') }}
                className="px-4 py-2 text-sm font-bold text-[var(--expense)] hover:bg-[var(--expense-dim)] rounded-lg transition-colors sm:ml-auto"
              >
                Resetta Filtri
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped List */}
      <div className="space-y-8">
        {groupedTransactions.map(([date, { txs, net }]) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center justify-between px-3 sm:px-6 py-2 bg-[var(--bg-elevated)]/40 rounded-2xl border border-[var(--border-subtle)]">
              <span className="text-xs font-black text-[var(--fg-primary)] uppercase tracking-widest">
                <span className="hidden sm:inline">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="sm:hidden">{new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </span>
              <span className={cn(
                "text-xs font-mono font-bold tracking-tight",
                net >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
              )}>
                {net > 0 ? '+' : ''}{formatCurrency(net)} <span className="text-[var(--fg-subtle)] font-medium text-[9px] uppercase ml-1">netto</span>
              </span>
            </div>

            <div className="glass rounded-[2rem] overflow-hidden border border-[var(--border-subtle)] shadow-sm">
              <div className="divide-y divide-[var(--border-subtle)]">
                {txs.map((tx) => (
                  <div 
                    key={tx.id} 
                    className={cn(
                      "group flex items-center justify-between p-4 transition-all duration-200",
                      selectedTx.includes(tx.id) ? "bg-[var(--accent-dim)]/5" : "hover:bg-[var(--bg-elevated)]/30"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedTx.includes(tx.id)} 
                          onChange={() => toggleSelect(tx.id)} 
                          aria-label={`Seleziona transazione ${tx.description}`}
                          className="w-4 h-4 rounded-md border-[var(--border-strong)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-dim)] accent-[var(--accent)] cursor-pointer" 
                        />
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm border border-white/5",
                        Number(tx.amount) < 0 ? "bg-[var(--expense-dim)] text-[var(--expense)]" : "bg-[var(--income-dim)] text-[var(--income)]"
                      )}>
                        {tx.category?.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[var(--fg-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                            {tx.description}
                          </p>
                          <button 
                            onClick={() => setEditingTx(tx)}
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-wider">
                            {tx.category?.name || 'Senza categoria'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                          <span className="text-[10px] font-medium text-[var(--fg-subtle)] uppercase tracking-tighter">
                            {tx.account.name}
                          </span>
                          {tx.status === 'STAGED' && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-[var(--warning)] uppercase bg-[var(--warning-dim)] px-1.5 py-0.5 rounded-md ml-1 border border-[var(--warning)]/10">
                              <AlertCircle size={8} /> In attesa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-mono font-bold text-base tracking-tighter",
                        Number(tx.amount) < 0 ? "text-[var(--expense)]" : "text-[var(--income)]"
                      )}>
                        {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-[3rem] border border-dashed border-[var(--border-default)]">
            <div className="w-16 h-16 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-4">
              <Search className="text-[var(--fg-subtle)]" />
            </div>
            <p className="text-[var(--fg-muted)] font-bold text-lg">Nessuna transazione trovata</p>
            <p className="text-[var(--fg-subtle)] text-sm max-w-xs mt-2">Prova a regolare i filtri o i termini di ricerca nel mese selezionato.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <TransactionEditModal 
          transaction={editingTx} 
          categories={categories} 
          accounts={accounts} 
          onClose={() => setEditingTx(null)} 
        />
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedTx.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-3 sm:px-4"
            style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="glass p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[var(--border-default)] flex items-center justify-between gap-2 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-2">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--accent-on)] font-bold text-sm shadow-[0_0_15px_var(--glow-accent)]">
                  {selectedTx.length}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-[var(--fg-primary)]">Elementi selezionati</p>
                  <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Modifica Batch</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative group">
                  <Tags className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--accent)] w-3.5 h-3.5 pointer-events-none" />
                  <select
                    onChange={handleChangeCategory}
                    className="pl-8 pr-6 py-2 sm:py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-[10px] sm:text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer appearance-none transition-all max-w-[110px] sm:max-w-none"
                  >
                    <option>Cambia Categoria</option>
                    {bothCategories.length > 0 && (
                      <optgroup label="── Entrambe ──">
                        {bothCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    )}
                    {incomeCategories.length > 0 && (
                      <optgroup label="── Solo Entrate ──">
                        {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    )}
                    {expenseCategories.length > 0 && (
                      <optgroup label="── Solo Uscite ──">
                        {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    )}
                    <option value="none">— Rimuovi Categoria —</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] w-3 h-3 pointer-events-none" />
                </div>

                <button 
                  onClick={handleConfirm} 
                  disabled={isPending} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-[var(--accent-on)] rounded-xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all duration-300 font-bold text-xs disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span className="hidden sm:inline">Conferma</span>
                </button>

                <button 
                  onClick={handleDelete} 
                  disabled={isPending} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--expense-dim)] text-[var(--expense)] border border-[var(--expense)]/20 rounded-xl hover:bg-[var(--expense)] hover:text-white transition-all duration-300 font-bold text-xs disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">Elimina</span>
                </button>

                <div className="w-px h-8 bg-[var(--border-subtle)] mx-1" />

                <button 
                  onClick={() => setSelectedTx([])} 
                  className="p-2.5 text-[var(--fg-muted)] hover:text-[var(--fg-primary)] rounded-xl hover:bg-[var(--bg-elevated)] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
