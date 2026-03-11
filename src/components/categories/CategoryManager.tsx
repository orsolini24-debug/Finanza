'use client'

import { useState, useTransition, useEffect } from 'react'
import { Category, CategoryType } from '@prisma/client'
import { Plus, Edit2, Trash2, X, Check, Loader2, ChevronRight, Smile, Search } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type CategoryWithParent = Category & { parent: Category | null }

interface CategoryManagerProps {
  categories: CategoryWithParent[]
}

const EMOJI_OPTIONS = [
  '🛒', '🛍️', '🍲', '🏥', '🎬', '🚗', '💡', '🏠', '💰', '📈', '🔄', '📦', '✈️', '📚', '💪', '📱',
  '☕', '🍕', '🍷', '🚌', '🚕', '⛽', '🎁', '🎮', '⚽', '🎨', '👔', '👠', '🍼', '🐶', '🌿', '🛠️'
]

const EMOJI_MAP: Record<string, string> = {
  'Spesa': '🛒', 'Supermercato': '🛒', 'Shopping': '🛍️', 'Cibo': '🍲', 'Ristorante': '🍲',
  'Salute': '🏥', 'Medicina': '🏥', 'Intrattenimento': '🎬', 'Cinema': '🎬', 'Trasporti': '🚗',
  'Auto': '🚗', 'Utenze': '💡', 'Luce': '💡', 'Gas': '💡', 'Casa': '🏠', 'Affitto': '🏠',
  'Stipendio': '💰', 'Bonus': '💰', 'Investimenti': '📈', 'Azioni': '📈', 'Trasferimento': '🔄',
  'Altro': '📦', 'Viaggi': '✈️', 'Aereo': '✈️', 'Istruzione': '📚', 'Scuola': '📚',
  'Palestra': '💪', 'Sport': '💪', 'Abbonamenti': '📱', 'Netflix': '📱', 'Amazon': '🛍️',
}

function getDisplayIcon(cat: CategoryWithParent) {
  if (cat.icon) return cat.icon;
  
  // Auto-mapping se icona manca nel DB
  for (const key in EMOJI_MAP) {
    if (cat.name.toLowerCase().includes(key.toLowerCase())) return EMOJI_MAP[key]
  }
  return '📁'
}

export default function CategoryManager({ categories }: CategoryManagerProps) {     
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithParent | null>(null)
  const [categoryType, setCategoryType] = useState<CategoryType>('BOTH')
  const [selectedIcon, setSelectedIcon] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const topLevel = categories.filter(c => !c.parentId)
  const parentOptions = topLevel

  const openCreate = () => {
    setEditingCategory(null)
    setCategoryType('BOTH')
    setSelectedIcon('')
    setError(null)
    setShowModal(true)
  }

  const openEdit = (cat: CategoryWithParent) => {
    setEditingCategory(cat)
    setCategoryType(cat.type || 'BOTH')
    setSelectedIcon(cat.icon || '')
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('type', categoryType)
    formData.set('icon', selectedIcon)

    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      setError("Nome obbligatorio");
      return;
    }

    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateCategory(editingCategory.id, formData)
        } else {
          await createCategory(formData)
        }
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Qualcosa è andato storto')
      }
    })
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[var(--bg-elevated)]/30 p-6 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <div>
          <h2 className="text-2xl font-display font-black text-[var(--fg-primary)] tracking-tight">Gestione Categorie</h2>
          <p className="text-[var(--fg-muted)] text-xs font-medium mt-1">Personalizza le tue icone e la struttura delle spese</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-8 py-3.5 rounded-2xl hover:shadow-[0_15px_30px_var(--glow-accent)] transition-all font-black text-[13px] uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Nuova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat, idx) => (
          <motion.div 
            key={cat.id} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
            className="glass group p-6 rounded-[2.5rem] hover:border-[var(--accent)]/50 transition-all duration-500 relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-[var(--accent)]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="w-14 h-14 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                {getDisplayIcon(cat)}
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 rounded-xl transition-all border border-[var(--border-subtle)] active:scale-90"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Eliminare questa categoria?')) {
                      deleteCategory(cat.id).then(() => router.refresh())
                    }
                  }}
                  className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] hover:border-[var(--expense)]/30 rounded-xl transition-all border border-[var(--border-subtle)] active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-6 relative z-10">
              <h3 className="text-lg font-black text-[var(--fg-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 tracking-tight">
                {cat.name}
              </h3>
              
              <div className="mt-3 flex items-center gap-2">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border",
                  cat.type === 'INCOME' ? "bg-[var(--income-dim)] text-[var(--income)] border-[var(--income)]/20" :
                  cat.type === 'EXPENSE' ? "bg-[var(--expense-dim)] text-[var(--expense)] border-[var(--expense)]/20" :
                  "bg-[var(--bg-elevated)] text-[var(--fg-subtle)] border-[var(--border-subtle)]"
                )}>
                  {cat.type === 'INCOME' ? 'Entrata' : cat.type === 'EXPENSE' ? 'Uscita' : 'Misto'}
                </span>
                {cat.parent && (
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--fg-subtle)] opacity-70">
                     <ChevronRight size={10} strokeWidth={3} />
                     <span className="truncate max-w-[80px]">{cat.parent.name}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-md glass bg-[var(--bg-surface)] rounded-[3rem] border border-[var(--border-default)] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-2xl font-display font-black text-[var(--fg-primary)] tracking-tight">
                  {editingCategory ? 'Modifica' : 'Nuova Categoria'}
                </h2>
                <p className="text-[var(--fg-muted)] text-[10px] uppercase font-bold tracking-widest mt-1">Dati essenziali</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all p-3 hover:bg-[var(--bg-elevated)] rounded-2xl">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex items-end gap-5">
                <div className="relative group">
                  <label className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1 mb-2 block">Icona</label>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-20 h-20 rounded-3xl bg-[var(--bg-input)] border-2 border-[var(--border-default)] flex items-center justify-center text-4xl hover:border-[var(--accent)] hover:shadow-[0_0_20px_var(--accent-dim)] transition-all shrink-0 active:scale-90"
                  >
                    {selectedIcon || <Smile className="text-[var(--fg-subtle)]" size={32} />}
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1 block">Nome</label>    
                  <input
                    name="name"
                    defaultValue={editingCategory?.name ?? ''}
                    required
                    autoFocus
                    className="w-full px-5 py-4 bg-[var(--bg-input)] border-2 border-[var(--border-default)] rounded-2xl focus:outline-none focus:border-[var(--accent)] text-[var(--fg-primary)] transition-all font-bold text-lg"
                    placeholder="es. Alimentari"
                  />
                </div>
              </div>

              {showIconPicker && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 p-5 bg-[var(--bg-input)] rounded-3xl border-2 border-[var(--border-default)]"
                >
                   <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] mb-2">
                      <Search size={14} className="text-[var(--fg-subtle)]" />
                      <input 
                        type="text" 
                        placeholder="Cerca emoji..." 
                        className="bg-transparent border-none outline-none text-[11px] font-bold w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                  <div className="grid grid-cols-6 gap-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                    {EMOJI_OPTIONS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setSelectedIcon(e); setShowIconPicker(false); }}
                        className="text-2xl hover:scale-125 hover:rotate-6 transition-all p-1"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1 block">Tipo Flusso</label>
                  <div className="flex p-1.5 bg-[var(--bg-input)] rounded-[1.2rem] border-2 border-[var(--border-default)]">
                    {[
                      { id: 'INCOME', label: 'Entrata', color: 'bg-[var(--income)]' },
                      { id: 'EXPENSE', label: 'Uscita', color: 'bg-[var(--expense)]' },
                      { id: 'BOTH', label: 'Entrambe', color: 'bg-[var(--accent)]' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCategoryType(t.id as CategoryType)}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] font-black uppercase rounded-[0.9rem] transition-all duration-300",
                          categoryType === t.id ? `${t.color} text-white shadow-lg scale-[1.02]` : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1 block">Parent Category (Opzionale)</label>
                  <select
                    name="parentId"
                    defaultValue={editingCategory?.parentId ?? ''}
                    className="w-full px-5 py-4 bg-[var(--bg-input)] border-2 border-[var(--border-default)] rounded-2xl focus:outline-none focus:border-[var(--accent)] text-[var(--fg-primary)] transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Nessuna (Top Level)</option>
                    {parentOptions
                      .filter(p => p.id !== editingCategory?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-black text-[12px] uppercase tracking-widest bg-[var(--bg-elevated)] rounded-2xl transition-all hover:text-[var(--fg-primary)] active:scale-95"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-black text-[12px] uppercase tracking-widest rounded-2xl hover:shadow-[0_15px_30px_var(--glow-accent)] transition-all disabled:opacity-50 active:scale-95"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                  {editingCategory ? 'Salva Modifiche' : 'Crea Ora'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  )
}
