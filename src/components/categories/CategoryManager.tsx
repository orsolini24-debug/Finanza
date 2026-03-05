'use client'

import { useState, useTransition, useEffect } from 'react'
import { Category, CategoryType } from '@prisma/client'
import { Plus, Edit2, Trash2, X, Check, Loader2, Tag, ChevronRight, ChevronDown, AlertCircle as AlertIcon } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type CategoryWithParent = Category & { parent: Category | null }

interface CategoryManagerProps {
  categories: CategoryWithParent[]
}

const EMOJI_MAP: Record<string, string> = {
  'Spesa': '🛒',
  'Shopping': '🛍️',
  'Cibo': '🍲',
  'Salute': '🏥',
  'Intrattenimento': '🎬',
  'Trasporti': '🚗',
  'Utenze': '💡',
  'Casa': '🏠',
  'Stipendio': '💰',
  'Investimenti': '📈',
  'Trasferimento': '🔄',
  'Altro': '📦',
  'Viaggi': '✈️',
  'Istruzione': '📚',
  'Palestra': '💪',
  'Abbonamenti': '📱'
}

function getEmoji(name: string) {
  for (const key in EMOJI_MAP) {
    if (name.toLowerCase().includes(key.toLowerCase())) return EMOJI_MAP[key]
  }
  return '📁'
}

export default function CategoryManager({ categories }: CategoryManagerProps) {     
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithParent | null>(null)
  const [categoryType, setCategoryType] = useState<CategoryType>('BOTH')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const topLevel = categories.filter(c => !c.parentId)
  const parentOptions = topLevel

  const openCreate = () => {
    setEditingCategory(null)
    setCategoryType('BOTH')
    setError(null)
    setShowModal(true)
  }

  const openEdit = (cat: CategoryWithParent) => {
    setEditingCategory(cat)
    setCategoryType(cat.type || 'BOTH')
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('type', categoryType)

    // Problem #39 - trim name
    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      setError("Nome obbligatorio");
      return;
    }
    formData.set('name', name);

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

  const handleDelete = (cat: CategoryWithParent) => {
    if (!confirm(`Eliminare la categoria "${cat.name}"? Le transazioni diventeranno non categorizzate.`)) return
    startTransition(async () => {
      try {
        await deleteCategory(cat.id)
        router.refresh()
      } catch (err: any) {
        alert(err.message || 'Eliminazione fallita')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          Aggiungi Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat, idx) => (
          <div 
            key={cat.id} 
            className="glass group p-6 rounded-3xl hover:-translate-y-2 transition-all duration-300 stagger-item border border-[var(--border-subtle)]"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                {getEmoji(cat.name)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--accent)] rounded-lg transition-colors border border-[var(--border-subtle)]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  disabled={isPending}
                  className="p-1.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] rounded-lg transition-colors border border-[var(--border-subtle)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--fg-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                {cat.name}
              </h3>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                cat.type === 'INCOME' ? "bg-[var(--income-dim)] text-[var(--income)] border-[var(--income)]/20" :
                cat.type === 'EXPENSE' ? "bg-[var(--expense-dim)] text-[var(--expense)] border-[var(--expense)]/20" :
                "bg-[var(--bg-elevated)] text-[var(--fg-subtle)] border-[var(--border-subtle)]"
              )}>
                {cat.type === 'INCOME' ? 'Entrata' : cat.type === 'EXPENSE' ? 'Uscita' : 'Entrambe'}
              </span>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              {cat.parent ? (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--fg-subtle)]">
                  <span>{cat.parent.name}</span>
                  <ChevronRight size={10} />
                  <span className="text-[var(--accent)]">Sottocategoria</span>
                </div>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--fg-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md">
                  Livello Base
                </span>
              )}
            </div>
          </div>
        ))}
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
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-2 hover:bg-[var(--bg-elevated)] rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome *</label>    
                <input
                  name="name"
                  defaultValue={editingCategory?.name ?? ''}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium"
                  placeholder="es. Alimentari"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Tipo Categoria</label>
                <div className="flex p-1 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => setCategoryType('INCOME')}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all",
                      categoryType === 'INCOME' ? "bg-[var(--income)] text-[var(--accent-on)] shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    Entrata
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('EXPENSE')}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all",
                      categoryType === 'EXPENSE' ? "bg-[var(--expense)] text-white shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    Uscita
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('BOTH')}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all",
                      categoryType === 'BOTH' ? "bg-[var(--bg-elevated)] text-[var(--fg-primary)] shadow-lg border border-[var(--border-subtle)]" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    Entrambe
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Categoria Genitore</label>
                <div className="relative">
                  <select
                    name="parentId"
                    defaultValue={editingCategory?.parentId ?? ''}
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">— Nessuna (livello base) —</option>
                    {parentOptions
                      .filter(p => p.id !== editingCategory?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
                </div>
              </div>
              
              {error && (
                <div className="p-4 bg-[var(--expense-dim)] border border-[var(--expense)]/20 rounded-xl flex items-center gap-3 animate-shake">
                   <AlertIcon className="w-5 h-5 text-[var(--expense)]" />
                   <p className="text-sm text-[var(--expense)] font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingCategory ? 'Salva Modifiche' : 'Crea Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
