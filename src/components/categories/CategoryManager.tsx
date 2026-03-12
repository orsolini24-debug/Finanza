'use client'

import { useState, useTransition, useEffect } from 'react'
import { Category, CategoryType } from '@prisma/client'
import { Plus, Edit2, Trash2, X, Check, Loader2, ChevronRight, Smile, Search } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

type CategoryWithParent = Category & { parent: Category | null }

interface CategoryManagerProps {
  categories: CategoryWithParent[]
}

const EMOJI_MAP: Record<string, string> = {
  // Spesa e Alimentari
  'Spesa': '🛒', 'Supermercato': '🛒', 'Alimentari': '🛒', 'Lidl': '🛒', 'Conad': '🛒', 'Coop': '🛒', 'Esselunga': '🛒', 'Carrefour': '🛒', 'Penny': '🛒', 'MD': '🛒', 'Eurospin': '🛒', 'Pam': '🛒', 'Despar': '🛒', 'Gigante': '🛒',
  'Panificio': '🥖', 'Pane': '🥖', 'Pasticceria': '🍰', 'Dolci': '🍩', 'Frutta': '🍎', 'Verdura': '🥗', 'Macelleria': '🥩', 'Pescheria': '🐟', 'Latte': '🥛', 'Uova': '🥚', 'Gastronomia': '🍱', 'Mercato': '🧺', 'Pranzo': '🍲', 'Cena': '🍲',

  // Shopping e Abbigliamento
  'Shopping': '🛍️', 'Amazon': '🛍️', 'Vestiti': '👔', 'Abbigliamento': '👔', 'Scarpe': '👠', 'Regalo': '🎁', 'Zalando': '🛍️', 'Shein': '🛍️', 'Temu': '🛍️', 'H&M': '👔', 'Zara': '👔', 'Uniqlo': '👔', 'Nike': '👟', 'Adidas': '👟',
  'Elettronica': '🔌', 'Mediaworld': '🔌', 'Unieuro': '🔌', 'Apple': '📱', 'Samsung': '📱', 'Hardware': '💻', 'Software': '💿', 'Gadget': '🕹️', 'Batterie': '🔋',
  'Libri': '📚', 'Libreria': '📚', 'Mondadori': '📚', 'Feltrinelli': '📚', 'Cartoleria': '📒',

  // Cibo e Drink
  'Cibo': '🍲', 'Ristorante': '🍲', 'Pizzeria': '🍕', 'Sushi': '🍣', 'Fast Food': '🍔', 'McDonald': '🍔', 'Burger King': '🍔', 'KFC': '🍗', 'Poke': '🍱', 'Trattoria': '🍲', 'Osteria': '🍷',
  'Bar': '☕', 'Caffè': '☕', 'Colazione': '🍳', 'Aperitivo': '🍹', 'Birra': '🍺', 'Vino': '🍷', 'Pub': '🍺', 'Discoteca': '💃', 'Cocktail': '🍹', 'Gusti': '🍦', 'Gelato': '🍦', 'Starbucks': '☕', 'Nespresso': '☕',

  // Salute e Benessere
  'Salute': '🏥', 'Medicina': '💊', 'Farmacia': '💊', 'Dentista': '🦷', 'Visita': '🏥', 'Dottore': '🏥', 'Ospedale': '🏥', 'Ottico': '👓', 'Occhiali': '👓', 'Lenti': '👓',
  'Palestra': '💪', 'Sport': '💪', 'Piscina': '🏊', 'Tennis': '🎾', 'Calcetto': '⚽', 'Yoga': '🧘', 'Crossfit': '💪', 'Padel': '🎾', 'Running': '🏃', 'Corsa': '🏃', 'Calcio': '⚽', 'Basket': '🏀', 'Snowboard': '🏂', 'Nuoto': '🏊',
  'Psicologo': '🧠', 'Terapia': '🧠', 'Massage': '🧖', 'Spa': '🧖', 'Benessere': '✨', 'Estetista': '💅', 'Barbiere': '💇', 'Parrucchiere': '💇',

  // Trasporti
  'Trasporti': '🚗', 'Auto': '🚗', 'Benzina': '⛽', 'Carburante': '⛽', 'Diesel': '⛽', 'Parcheggio': '🅿️', 'Pedaggio': '🛣️', 'Autostrada': '🛣️', 'Telepass': '🛣️', 'Meccanico': '🛠️', 'Revisione': '🛠️', 'Lavaggio': '🚿', 'Assicurazione': '🛡️',
  'Treno': '🚆', 'Trenitalia': '🚆', 'Italo': '🚆', 'Autobus': '🚌', 'Bus': '🚌', 'Taxi': '🚕', 'Freenow': '🚕', 'Uber': '🚕', 'Metro': '🚇', 'Bicicletta': '🚲', 'Bici': '🚲', 'Monopattino': '🛴', 'Traghetto': '🚢',

  // Casa e Utenze
  'Casa': '🏠', 'Affitto': '🏠', 'Mutuo': '🏠', 'Condominio': '🏠', 'Arredamento': '🛋️', 'Mobili': '🛋️', 'Ikea': '🛋️', 'Leroy Merlin': '🛠️', 'Brico': '🛠️', 'Casalinghi': '🧺', 'Giardino': '🪴', 'Fiori': '💐',
  'Utenze': '💡', 'Bolletta': '💡', 'Luce': '💡', 'Enel': '💡', 'Gas': '🔥', 'Acqua': '💧', 'Internet': '🌐', 'Wifi': '🌐', 'Fibra': '🌐', 'Telefono': '📞', 'Mobile': '📱', 'Sky': '📺', 'Dazn': '⚽', 'Disney': '🍿', 'Netflix': '🍿',
  'Pulizie': '🧹', 'Lavanderia': '🧺', 'Riparazione': '🛠️', 'Manutenzione': '🛠️', 'Idraulico': '🔧', 'Elettricista': '⚡', 'Condizionatore': '❄️',

  // Intrattenimento e Media
  'Intrattenimento': '🎬', 'Cinema': '🍿', 'Teatro': '🎭', 'Concerto': '🎸', 'Musica': '🎵', 'Evento': '🎫', 'Stadio': '⚽', 'Mostra': '🎨', 'Museo': '🏛️', 'Spotify': '🎵', 'Audible': '🎧', 'YouTube': '📺',
  'Gaming': '🎮', 'Playstation': '🎮', 'Xbox': '🎮', 'Nintendo': '🎮', 'Steam': '🎮', 'Giochi': '🎲', 'Scommesse': '🎰', 'Casinò': '🎰',

  // Viaggi e Vacanze
  'Viaggi': '✈️', 'Vacanza': '🏖️', 'Spiaggia': '🏖️', 'Mare': '🏖️', 'Montagna': '🏔️', 'Settimana Bianca': '🎿', 'Escursione': '🥾', 'Campeggio': '⛺',
  'Hotel': '🏨', 'Albergo': '🏨', 'Airbnb': '🏠', 'Booking': '🏨', 'Hostel': '🛌', 'B&B': '🏠', 'Ryanair': '✈️', 'Easyjet': '✈️', 'Lufthansa': '✈️', 'Valigia': '🧳', 'Passaporto': '🛂',

  // Lavoro e Finanza
  'Stipendio': '💰', 'Bonus': '💰', 'Premi': '💰', 'Freelance': '💻', 'Fattura': '📄', 'P.IVA': '💼', 'Rimborso': '💸', 'Vendita': '🏷️', 'Dividendi': '💎', 'Trading': '📈', 'Investimenti': '📈',
  'Banca': '🏦', 'Prestito': '🏦', 'Interessi': '📊', 'Commissioni': '💸', 'Crypto': '₿', 'Bitcoin': '₿', 'Ethereum': 'Ξ', 'Carta': '💳', 'Contanti': '💵', 'Ricarica': '📱',
  'Tasse': '⚖️', 'Multa': '⚖️', 'Agenzia Entrate': '⚖️', 'Bollo': '⚖️', 'IVA': '⚖️', 'IMU': '🏠', 'TARI': '🗑️',

  // Famiglia e Sociale
  'Famiglia': '👫', 'Figli': '🧒', 'Bambini': '🧸', 'Scuola': '📚', 'Asilo': '🍼', 'Giocattoli': '🧸', 'Mensa': '🍱', 'Libri Scolastici': '📚', 'Babysitter': '👶',
  'Genitori': '👴', 'Compleanno': '🎂', 'Matrimonio': '💍', 'Festa': '🎉', 'Beneficenza': '🤝', 'Donazione': '❤️', 'Chiesa': '⛪',


  // Altro
  'Altro': '📦', 'Varie': '📦', 'Cura Personale': '🧴', 'Trucchi': '💄', 'Sapone': '🧼', 'Profumeria': '🧖',
  'Animali': '🐱', 'Cane': '🐶', 'Gatto': '🐱', 'Veterinario': '🏥', 'Croccantini': '🐱', 'Hobby': '🎨', 'Fai da te': '🛠️', 'Tabacco': '🚬', 'Sigarette': '🚬', 'Svapo': '🚬'
}

// Grouped emoji data for the picker
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: '⭐ Popolari', emojis: ['🛒','🛍️','🍲','🏥','🎬','🚗','💡','🏠','💰','📈','📦','✈️','📚','💪','📱','🎁','💻','💳','☕','🍕','⚽','🎮','🏦','💊'] },
  { label: '🍕 Cibo & Drink', emojis: ['☕','🍕','🍷','🍣','🍔','🍦','🍰','🍹','🍺','🥖','🍎','🍳','🥗','🍩','🥐','🍗','🍜','🍱','🥨','🍪','🥤','🥞','🥓','🥩','🧀','🥛','🥚','🍲','💃'] },
  { label: '🚗 Trasporti & Viaggi', emojis: ['🚗','🚲','🛴','🛵','🚆','🚌','🚕','🚇','🚢','✈️','🏨','🏖️','🏔️','🗺️','🎫','⛽','🛣️','🅿️','🧳','🛂','⛺','🏂','🛡️','🛠️'] },
  { label: '🏠 Casa & Utenze', emojis: ['🏠','🛋️','🪴','🧹','🧼','🧴','🚿','🧺','🔑','🔒','🏡','🛌','🪑','🔨','🪛','🔧','💡','🔥','💧','🌐','📞','📺','🍿','❄️','⚡','🗑️','💐'] },
  { label: '💊 Salute & Sport', emojis: ['💊','🦷','👓','🧘','⚽','🏀','🎾','🚴','🏊','🏐','🥊','🎿','⛸️','🏸','🏃','🥾','🏋️','⛳','🏄',' skateboard','🏹','🎣','🧗','🚵','🏥','🧠','💪','✨','💅','💇','🧖'] },
  { label: '🎮 Svago & Hobby', emojis: ['🍿','🎮','🎭','🎸','🎨','📸','🎹','🎻','🎤','🎲','🧩','🧵','🧶','🌳','🔭','♟️','🎷','🎺','🎧','📻','🎥','🃏','🎪','🎰','🎵','🏛️'] },
  { label: '💰 Lavoro & Finanza', emojis: ['💰','💻','📄','💼','📊','📉','💳','🏧','⚖️','💸','💎','₿','🏦','💵','🪙','🛡️','📣','📒','📈','🏷️','📠','🖋️','💼'] },
  { label: '🛍️ Shopping', emojis: ['🛍️','👔','👠','👟','🔌','📱','💿','🕹️','🔋','📚','🧴','💄','🧼','🎁'] },
  { label: '👫 Famiglia & Sociale', emojis: ['👫','🧒','🧸','📚','🍼','👶','👴','👵','🎂','💍','🎉','🤝','❤️','⛪','🕌','🕯️'] },
  { label: '📦 Altro', emojis: ['📦','🐶','🐱','🐰','🐹','🦜','🐴','🌿','🌻','🔥','💧','🌐','🚬','🧿','🍀','🔄','📁','✉️','🛠️','🐟','🌐'] },
]

// Reverse search index: emoji → [keywords from EMOJI_MAP]
const EMOJI_SEARCH_INDEX: Record<string, string[]> = {}
Object.entries(EMOJI_MAP).forEach(([key, emoji]) => {
  if (!EMOJI_SEARCH_INDEX[emoji]) EMOJI_SEARCH_INDEX[emoji] = []
  EMOJI_SEARCH_INDEX[emoji].push(key.toLowerCase())
})

// All unique emojis across all groups
const ALL_EMOJIS = Array.from(new Set(EMOJI_GROUPS.flatMap(g => g.emojis)))

function getDisplayIcon(cat: CategoryWithParent) {
  if (cat.icon) return cat.icon
  for (const key in EMOJI_MAP) {
    if (cat.name.toLowerCase().includes(key.toLowerCase())) return EMOJI_MAP[key]
  }
  return '📁'
}

function EmojiButton({ emoji, onSelect, selected }: { emoji: string; onSelect: (e: string) => void; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(emoji)}
      className={cn(
        'aspect-square flex items-center justify-center text-2xl rounded-xl transition-all duration-150 hover:scale-110 hover:bg-[var(--bg-elevated)] active:scale-90',
        selected && 'bg-[var(--accent)]/20 ring-2 ring-[var(--accent)] scale-110'
      )}
    >
      {emoji}
    </button>
  )
}

export default function CategoryManager({ categories }: CategoryManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithParent | null>(null)
  const [categoryType, setCategoryType] = useState<CategoryType>('BOTH')
  const [selectedIcon, setSelectedIcon] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { confirm, open, handleConfirm, handleCancel, message } = useConfirm()

  const topLevel = categories.filter(c => !c.parentId)

  const openCreate = () => {
    setEditingCategory(null)
    setCategoryType('BOTH')
    setSelectedIcon('')
    setShowModal(true)
  }

  const openEdit = (cat: CategoryWithParent) => {
    setEditingCategory(cat)
    setCategoryType(cat.type || 'BOTH')
    setSelectedIcon(cat.icon || '')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('type', categoryType)
    formData.set('icon', selectedIcon)

    const name = (formData.get('name') as string)?.trim()
    if (!name) {
      toast.error('Nome obbligatorio')
      return
    }

    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateCategory(editingCategory.id, formData)
          toast.success("Categoria aggiornata")
        } else {
          await createCategory(formData)
          toast.success("Categoria creata")
        }
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Qualcosa è andato storto')
      }
    })
  }

  const handleDelete = async (cat: CategoryWithParent) => {
    if (await confirm(`Eliminare la categoria "${cat.name}"?`)) {
      startTransition(async () => {
        try {
          await deleteCategory(cat.id)
          toast.success("Categoria eliminata")
          router.refresh()
        } catch (err: any) {
          toast.error(err.message || "Errore durante l'eliminazione")
        }
      })
    }
  }

  const handleSelectEmoji = (emoji: string) => {
    setSelectedIcon(emoji)
    setShowIconPicker(false)
    setSearchTerm('')
  }

  const searchResults = searchTerm
    ? ALL_EMOJIS.filter(e =>
        EMOJI_SEARCH_INDEX[e]?.some(k => k.includes(searchTerm.toLowerCase()))
      )
    : []

  return (
    <div className="space-y-10">
      <ConfirmDialog 
        open={open} 
        message={message} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />

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
                  onClick={() => handleDelete(cat)}
                  disabled={isPending}
                  className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] hover:border-[var(--expense)]/30 rounded-xl transition-all border border-[var(--border-subtle)] active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 relative z-10">
              <h3 className="text-lg font-black text-[var(--fg-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 tracking-tight text-left">
                {cat.name}
              </h3>

              <div className="mt-3 flex items-center gap-2">
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border',
                  cat.type === 'INCOME' ? 'bg-[var(--income-dim)] text-[var(--income)] border-[var(--income)]/20' :
                  cat.type === 'EXPENSE' ? 'bg-[var(--expense-dim)] text-[var(--expense)] border-[var(--expense)]/20' :
                  'bg-[var(--bg-elevated)] text-[var(--fg-subtle)] border-[var(--border-subtle)]'
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
              <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
                <div className="text-left">
                  <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)] tracking-tight">
                    {editingCategory ? 'Modifica' : 'Nuova Categoria'}
                  </h2>
                  <p className="text-[var(--fg-muted)] text-[10px] uppercase font-bold tracking-widest mt-1">Dati essenziali</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-all p-3 hover:bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex items-end gap-5">
                  <div className="relative group text-left">
                    <label className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1 mb-2 block">Icona</label>
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(true)}
                      className="w-20 h-20 rounded-3xl bg-[var(--bg-input)] border-2 border-[var(--border-default)] flex items-center justify-center text-4xl hover:border-[var(--accent)] hover:shadow-[0_0_20px_var(--accent-dim)] transition-all shrink-0 active:scale-90"
                    >
                      {selectedIcon || <Smile className="text-[var(--fg-subtle)]" size={32} />}
                    </button>
                  </div>
                  <div className="flex-1 space-y-2 text-left">
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

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2 text-left">
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
                            'flex-1 py-2.5 text-[10px] font-black uppercase rounded-[0.9rem] transition-all duration-300',
                            categoryType === t.id ? `${t.color} text-white shadow-lg scale-[1.02]` : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)]'
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-[var(--fg-subtle)] uppercase tracking-widest ml-1 block">Parent Category (Opzionale)</label>
                    <select
                      name="parentId"
                      defaultValue={editingCategory?.parentId ?? ''}
                      className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="">Nessuna (Top Level)</option>
                      {topLevel
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
                    className="flex-1 px-6 py-4 text-[var(--fg-muted)] font-black text-[12px] uppercase tracking-widest bg-[var(--bg-elevated)] rounded-2xl transition-all hover:text-[var(--fg-primary)] active:scale-95 border border-[var(--border-subtle)]"
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

      {/* Icon picker modal */}
      <AnimatePresence>
        {showIconPicker && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setShowIconPicker(false); setSearchTerm('') }}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full sm:max-w-lg flex flex-col glass bg-[var(--bg-surface)] rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-[var(--border-default)] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
              style={{ maxHeight: '80dvh' }}
            >
              <div className="flex items-center gap-3 p-5 border-b border-[var(--border-subtle)] shrink-0">
                <Smile size={20} className="text-[var(--fg-muted)] shrink-0" />
                <h3 className="text-base font-black text-[var(--fg-primary)] tracking-tight shrink-0">Scegli Icona</h3>
                <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
                  <Search size={13} className="text-[var(--fg-subtle)] shrink-0" />
                  <input
                    type="text"
                    placeholder="Cerca (es. pizza, banca, sport...)"
                    autoFocus
                    className="bg-transparent border-none outline-none text-sm font-medium w-full text-[var(--fg-primary)] placeholder:text-[var(--fg-subtle)]"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowIconPicker(false); setSearchTerm('') }}
                  className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-6 custom-scrollbar">
                {searchTerm ? (
                  searchResults.length > 0 ? (
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--fg-subtle)] mb-3">
                        {searchResults.length} risultati per "{searchTerm}"
                      </p>
                      <div className="grid grid-cols-8 gap-1.5">
                        {searchResults.map(e => (
                          <EmojiButton key={e} emoji={e} onSelect={handleSelectEmoji} selected={selectedIcon === e} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-[var(--fg-subtle)] text-sm py-10 italic">Nessun risultato per "{searchTerm}"</p>
                  )
                ) : (
                  EMOJI_GROUPS.map(group => (
                    <div key={group.label} className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--fg-subtle)] mb-2 px-1">{group.label}</p>
                      <div className="grid grid-cols-8 gap-1.5">
                        {group.emojis.map(e => (
                          <EmojiButton key={`${group.label}-${e}`} emoji={e} onSelect={handleSelectEmoji} selected={selectedIcon === e} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
