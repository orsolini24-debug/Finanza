'use client'

import { useState, useTransition } from 'react'
import { CategoryType } from '@prisma/client'
import { X, Check, Loader2, Smile, Search } from 'lucide-react'
import { createCategory } from '@/app/actions/categories'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Re-using EMOJI data structure from CategoryManager for consistency
const EMOJI_MAP: Record<string, string> = {
  'Spesa': '🛒', 'Supermercato': '🛒', 'Alimentari': '🛒', 'Lidl': '🛒', 'Conad': '🛒', 'Coop': '🛒', 'Esselunga': '🛒', 'Carrefour': '🛒',
  'Shopping': '🛍️', 'Amazon': '🛍️', 'Vestiti': '👔', 'Cibo': '🍲', 'Ristorante': '🍲', 'Pizzeria': '🍕',
  'Salute': '🏥', 'Palestra': '💪', 'Trasporti': '🚗', 'Auto': '🚗', 'Treno': '🚆',
  'Casa': '🏠', 'Affitto': '🏠', 'Utenze': '💡', 'Bolletta': '💡', 'Internet': '🌐',
  'Svago': '🎬', 'Cinema': '🍿', 'Streaming': '🍿', 'Gaming': '🎮', 'Viaggi': '✈️',
  'Stipendio': '💰', 'Bonus': '💰', 'Investimenti': '📈', 'Altro': '📦'
}

const EMOJI_GROUPS = [
  { label: 'Popolari', emojis: ['🛒','🛍️','🍲','🏥','🎬','🚗','💡','🏠','💰','📈','📦','✈️','💪','📱','🎁','💻','☕','🍕','⚽','🎮','💊'] },
  { label: 'Cibo', emojis: ['☕','🍕','🍷','🍣','🍔','🍦','🍰','🍹','🍺','🥖','🍎','🍳','🥗','🍩','🍜','🍱'] },
  { label: 'Trasporti', emojis: ['🚗','🚲','🛵','🚆','🚌','🚕','🚇','🚢','✈️','🏨','🏖️','🏔️','⛽','🅿️'] },
  { label: 'Casa', emojis: ['🏠','🛋️','🪴','🧹','🧼','🚿','🧺','🔑','🔒','🔨','🔧','💡','🔥','💧','🌐'] },
  { label: 'Svago', emojis: ['🍿','🎮','🎭','🎸','🎨','📸','🎹','🎻','🎤','🎲','🧩','🌳','🎵','🏛️'] },
]

const ALL_EMOJIS = Array.from(new Set(EMOJI_GROUPS.flatMap(g => g.emojis)))

interface QuickCategoryModalProps {
  onClose: () => void
  onSuccess: (newCategoryId: string) => void
  initialName?: string
}

export default function QuickCategoryModal({ onClose, onSuccess, initialName = '' }: QuickCategoryModalProps) {
  const [name, setName] = useState(initialName)
  const [type, setType] = useState<CategoryType>('BOTH')
  const [icon, setIcon] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const formData = new FormData()
    formData.append('name', name)
    formData.append('type', type)
    formData.append('icon', icon)

    startTransition(async () => {
      try {
        const res = await createCategory(formData)
        if (res.success && res.category) {
          onSuccess(res.category.id)
        }
      } catch (err: any) {
        setError(err.message || 'Errore durante la creazione')
      }
    })
  }

  const filteredEmojis = searchTerm 
    ? ALL_EMOJIS.filter(e => e.includes(searchTerm)) // Simple search for now
    : []

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md glass bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-default)] shadow-2xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight uppercase">Nuova Categoria</h2>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-elevated)] rounded-xl text-[var(--fg-muted)]"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-end gap-4">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-default)] flex items-center justify-center text-3xl hover:border-[var(--accent)] transition-all shrink-0"
              >
                {icon || <Smile className="text-[var(--fg-subtle)]" size={24} />}
              </button>
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="es. Regali"
                  autoFocus
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm font-bold"
                />
              </div>
            </div>

            {showIconPicker && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="space-y-3 p-4 bg-[var(--bg-elevated)]/50 rounded-2xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border-subtle)]">
                  <Search size={12} className="text-[var(--fg-subtle)]" />
                  <input placeholder="Cerca..." className="bg-transparent border-none outline-none text-[10px] w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="grid grid-cols-7 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {(searchTerm ? filteredEmojis : EMOJI_GROUPS[0].emojis).map(e => (
                    <button key={e} type="button" onClick={() => { setIcon(e); setShowIconPicker(false); }} className="text-xl hover:scale-125 transition-transform p-1">{e}</button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Tipo Flusso</label>
              <div className="flex p-1 bg-[var(--bg-input)] rounded-xl border border-[var(--border-default)]">
                {[
                  { id: 'INCOME', label: 'Entrata', color: 'bg-[var(--income)]' },
                  { id: 'EXPENSE', label: 'Uscita', color: 'bg-[var(--expense)]' },
                  { id: 'BOTH', label: 'Misto', color: 'bg-[var(--accent)]' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as CategoryType)}
                    className={cn(
                      "flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all",
                      type === t.id ? `${t.color} text-white shadow-md` : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-[var(--expense)] text-[10px] font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full py-4 bg-[var(--accent)] text-[var(--accent-on)] font-black uppercase tracking-widest text-xs rounded-2xl hover:shadow-[0_10px_30px_var(--glow-accent)] transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Crea Categoria'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
