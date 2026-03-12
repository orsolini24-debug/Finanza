'use client'

import { useState, useTransition, useMemo } from 'react'
import { Rule, Category } from '@prisma/client'
import { Plus, Play, Pause, Trash2, Edit2, Zap, X, Check, Loader2, ChevronRight, ArrowRight, Tag, Hash, ChevronDown } from 'lucide-react'
import { createRule, updateRule, deleteRule, toggleRule } from '@/app/actions/rules'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import QuickCategoryModal from '@/components/categories/QuickCategoryModal'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

type RuleWithCategory = Rule & { category: Category | null }

interface RulesManagerProps {
  rules: RuleWithCategory[]
  categories: Category[]
}

const defaultForm = { name: '', contains: '', setCategoryId: '', addTagName: '', markTransfer: false, priority: 100 }

export default function RulesManager({ rules, categories }: RulesManagerProps) {    
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<RuleWithCategory | null>(null)     
  const [form, setForm] = useState(defaultForm)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showQuickCat, setShowQuickCat] = useState(false)
  const [localCategories, setLocalCategories] = useState<Category[]>([])
  const router = useRouter()
  const { confirm, open, handleConfirm, handleCancel, message } = useConfirm()

  const allCategories = useMemo(() => {
    const merged = [...categories]
    localCategories.forEach(lc => { if (!merged.find(c => c.id === lc.id)) merged.push(lc) })
    return merged
  }, [categories, localCategories])

  const openCreate = () => {
    setEditingRule(null)
    setForm(defaultForm)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (rule: RuleWithCategory) => {
    setEditingRule(rule)
    setForm({
      name: rule.name,
      contains: rule.contains ?? '',
      setCategoryId: rule.setCategoryId ?? '',
      addTagName: rule.addTagName ?? '',
      markTransfer: rule.markTransfer,
      priority: rule.priority,
    })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('markTransfer', form.markTransfer ? 'true' : 'false')

    startTransition(async () => {
      try {
        if (editingRule) {
          await updateRule(editingRule.id, formData)
          toast.success('Regola aggiornata')
        } else {
          await createRule(formData)
          toast.success('Regola creata')
        }
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Qualcosa è andato storto')
      }
    })
  }

  const handleDelete = async (rule: RuleWithCategory) => {
    if (!await confirm(`Eliminare la regola "${rule.name}"?`)) return
    startTransition(async () => {
      await deleteRule(rule.id)
      toast.success('Regola eliminata')
      router.refresh()
    })
  }

  const handleToggle = (rule: RuleWithCategory) => {
    startTransition(async () => {
      await toggleRule(rule.id, !rule.isEnabled)
      toast.success(rule.isEnabled ? 'Regola disabilitata' : 'Regola abilitata')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
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
            setForm(f => ({ ...f, setCategoryId: newCatId }))
            setShowQuickCat(false)
            router.refresh()
          }}
        />
      )}

      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-on)] px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuova Regola
        </button>
      </div>

      <div className="grid gap-6">
        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            className={cn(
              "glass p-6 rounded-[2rem] border border-[var(--border-subtle)] flex items-center justify-between transition-all duration-300 stagger-item",
              !rule.isEnabled && "opacity-50 grayscale-[0.5]"
            )}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex items-center gap-6">
              <div className={cn(
                "p-4 rounded-2xl transition-all duration-300",
                rule.isEnabled 
                  ? "bg-[var(--accent-dim)] text-[var(--accent)] shadow-[0_0_15px_var(--glow-accent)]" 
                  : "bg-[var(--bg-elevated)] text-[var(--fg-subtle)]"
              )}>    
                <Zap className={cn("w-6 h-6", rule.isEnabled && "animate-pulse")} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--fg-primary)]">{rule.name}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                    <span className="text-[var(--fg-subtle)]">Se</span>
                    <span className="text-[var(--fg-primary)]">"{rule.contains}"</span>
                  </div>
                  <ArrowRight size={14} className="text-[var(--fg-subtle)]" />
                  {rule.category && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--income-dim)] border border-[var(--income)]/20 rounded-lg text-[10px] font-bold text-[var(--income)] uppercase tracking-wider">
                      <Tag size={12} />
                      <span>{rule.category.name}</span>
                    </div>
                  )}
                  {rule.addTagName && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                      <Hash size={12} />
                      <span>{rule.addTagName}</span>
                    </div>
                  )}
                  {rule.markTransfer && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--warning-dim)] border border-[var(--warning)]/20 rounded-lg text-[10px] font-bold text-[var(--warning)] uppercase tracking-wider">
                      Trasferimento
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="px-3 py-1.5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-center min-w-[60px]">
                <span className="block text-[8px] text-[var(--fg-subtle)] uppercase font-extrabold tracking-[0.2em] mb-0.5">Ordine</span>
                <span className="font-mono font-bold text-sm text-[var(--fg-primary)] tracking-tighter">{rule.priority}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(rule)}
                  disabled={isPending}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all duration-200",
                    rule.isEnabled 
                      ? "bg-[var(--bg-elevated)] text-[var(--accent)] hover:bg-[var(--accent-dim)] border-[var(--border-subtle)]" 
                      : "bg-[var(--accent)] text-[var(--accent-on)] border-transparent"
                  )}
                  title={rule.isEnabled ? 'Disabilita' : 'Abilita'}
                >
                  {rule.isEnabled ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={() => openEdit(rule)} className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)] rounded-xl border border-[var(--border-subtle)] transition-all">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(rule)}
                  disabled={isPending}
                  className="p-2.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--expense)] rounded-xl border border-[var(--border-subtle)] transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="glass py-24 rounded-[3rem] border border-dashed flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-6">
              <Zap className="w-10 h-10 text-[var(--fg-subtle)] opacity-50" />
            </div>
            <p className="text-[var(--fg-muted)] font-bold text-xl">Nessuna regola impostata</p>
            <p className="text-[var(--fg-subtle)] text-sm max-w-xs mt-3">Le regole intelligenti categorizzeranno automaticamente i tuoi estratti conto all'importazione.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-[var(--border-default)] overflow-hidden scale-in animate-in zoom-in-95">
            <div className="flex justify-between items-center p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <h2 className="text-xl font-display font-bold text-[var(--fg-primary)]">
                {editingRule ? 'Modifica Regola' : 'Nuova Regola'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors p-2 hover:bg-[var(--bg-elevated)] rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Nome Regola *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}    
                  required
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium"
                  placeholder="es. Spesa Esselunga"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Se la descrizione contiene</label>
                <input
                  name="contains"
                  value={form.contains}
                  onChange={e => setForm(f => ({ ...f, contains: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium"
                  placeholder="es. esselunga"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Imposta Categoria</label>
                  <button type="button" onClick={() => setShowQuickCat(true)}
                    className="flex items-center gap-1 text-[9px] font-black uppercase text-[var(--accent)] hover:underline tracking-widest">
                    <Plus size={10} /> Nuova
                  </button>
                </div>
                <div className="relative">
                  <select
                    name="setCategoryId"
                    value={form.setCategoryId}
                    onChange={e => setForm(f => ({ ...f, setCategoryId: e.target.value }))}
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">— Nessuna categoria —</option>
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Aggiungi Tag</label>   
                <input
                  name="addTagName"
                  value={form.addTagName}
                  onChange={e => setForm(f => ({ ...f, addTagName: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium"
                  placeholder="es. lavoro"
                />
              </div>
              <div className="flex items-end gap-6">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">Ordine di applicazione (1 = prima)</label>
                  <input
                    name="priority"
                    type="number"
                    min={1}
                    max={9999}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 100 }))}
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-mono font-bold"
                  />
                </div>
                <div className="flex items-center gap-3 mb-3 p-3 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                  <input
                    type="checkbox"
                    id="markTransfer"
                    checked={form.markTransfer}
                    onChange={e => setForm(f => ({ ...f, markTransfer: e.target.checked }))}
                    className="w-4 h-4 rounded border-[var(--border-strong)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-dim)] accent-[var(--accent)]"
                  />
                  <label htmlFor="markTransfer" className="text-xs font-bold uppercase tracking-widest text-[var(--fg-muted)] cursor-pointer">Trasferimento</label>
                </div>
              </div>

              {error && <p className="text-[var(--expense)] text-sm font-medium">{error}</p>}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all">Annulla</button>   
                <button type="submit" disabled={isPending} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-on)] font-bold text-sm rounded-2xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all disabled:opacity-50">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingRule ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
