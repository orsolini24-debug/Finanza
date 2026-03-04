'use client'

import { useState, useTransition } from 'react'
import { Transaction, Category, Account } from '@prisma/client'
import { Search, Filter, Check, X, Trash2, Tags } from 'lucide-react'
import { confirmTransactions, deleteTransactions, setTransactionCategory } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'

type TransactionWithRelations = Transaction & {
  category: Category | null;
  account: Account;
}

interface TransactionsTableProps {
  transactions: TransactionWithRelations[];
  categories: Category[];
}

export default function TransactionsTable({ transactions, categories }: TransactionsTableProps) {
  const [selectedTx, setSelectedTx] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const toggleSelect = (id: string) => {
    setSelectedTx(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedTx.length === transactions.length) {
      setSelectedTx([])
    } else {
      setSelectedTx(transactions.map(t => t.id))
    }
  }

  const handleConfirm = () => {
    startTransition(async () => {
      await confirmTransactions(selectedTx)
      setSelectedTx([])
    })
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedTx.length} transactions? This cannot be undone.`)) {
        startTransition(async () => {
            await deleteTransactions(selectedTx)
            setSelectedTx([])
        })
    }
  }
  
  const handleChangeCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value === 'none' ? null : e.target.value
    startTransition(async () => {
        await setTransactionCategory(selectedTx, categoryId)
        setSelectedTx([])
    })
  }

  return (
    <>
      {selectedTx.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg flex items-center justify-between">
          <span className="text-blue-700 dark:text-blue-300 font-medium">{selectedTx.length} transactions selected</span>
          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={isPending} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm disabled:opacity-50">
              <Check className="w-4 h-4" />
              <span>Confirm</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                <Tags className="w-4 h-4" />
                <select onChange={handleChangeCategory} className="bg-transparent focus:outline-none -ml-2 -mr-2">
                    <option>Change Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="none">-- Remove Category --</option>
                </select>
            </div>
            <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm border border-red-100 disabled:opacity-50">
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button onClick={() => setSelectedTx([])} className="p-1.5 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-950 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
            <tr>
              <th className="px-6 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedTx.length === transactions.length && transactions.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Account</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Amount</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {transactions.map((tx) => (
              <tr key={tx.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900 transition ${selectedTx.includes(tx.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTx.includes(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-medium">{tx.description}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${tx.category ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : 'text-gray-400'}`}>
                    {tx.category?.name || 'Uncategorized'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{tx.account.name}</td>
                <td className={`px-6 py-4 text-sm font-mono text-right font-semibold ${Number(tx.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Number(tx.amount) < 0 ? '' : '+'}{Number(tx.amount).toFixed(2)} €
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${tx.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
            <div className="text-center p-8 text-gray-500">No transactions found. Import a CSV file to get started.</div>
        )}
      </div>
    </>
  )
}
