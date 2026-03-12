'use client'

import { useState, useTransition, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { searchTransactions } from '@/app/actions/transactions'
import { Transaction, Category, Account } from '@prisma/client'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type TxWithRelations = Transaction & { category: Category | null; account: Account | null }

interface Props { workspaceId: string }

export default function SearchBar({ workspaceId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TxWithRelations[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchTransactions(workspaceId, val)
        setResults(res as TxWithRelations[])
        setOpen(true)
      })
    }, 300)
  }

  const clear = () => { setQuery(''); setResults([]); setOpen(false) }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center">
        {isPending
          ? <Loader2 size={16} className="absolute left-4 text-[var(--fg-subtle)] animate-spin" />
          : <Search size={16} className="absolute left-4 text-[var(--fg-subtle)]" />
        }
        <input
          value={query}
          onChange={handleChange}
          placeholder="Cerca transazioni..."
          className="w-full pl-10 pr-10 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-sm font-medium text-[var(--fg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--fg-subtle)]"
        />
        {query && (
          <button onClick={clear} className="absolute right-4 text-[var(--fg-muted)] hover:text-[var(--fg-primary)]">
            <X size={14} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 glass bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar"
          >
            {results.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border-subtle)] last:border-0">
                <div>
                  <p className="text-sm font-bold text-[var(--fg-primary)] line-clamp-1">{tx.description}</p>
                  <p className="text-[10px] text-[var(--fg-subtle)] font-medium">
                    {new Date(tx.date).toLocaleDateString('it-IT')}
                    {tx.category && ` • ${tx.category.name}`}
                  </p>
                </div>
                <span className={cn('font-mono font-bold text-sm ml-4', Number(tx.amount) > 0 ? 'text-[var(--income)]' : 'text-[var(--expense)]')}>
                  {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            ))}
          </motion.div>
        )}
        {open && results.length === 0 && !isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 glass bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 text-center shadow-2xl">
            <p className="text-sm text-[var(--fg-muted)] font-medium">Nessun risultato per "{query}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}