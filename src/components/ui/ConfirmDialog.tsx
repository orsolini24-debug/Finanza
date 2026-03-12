'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({ open, message, onConfirm, onCancel, confirmLabel = 'Conferma', danger = true }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full max-w-sm glass bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-default)] shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${danger ? 'bg-[var(--expense-dim)] text-[var(--expense)]' : 'bg-[var(--accent-dim)] text-[var(--accent)]'}`}>
                <AlertTriangle size={22} />
              </div>
              <p className="text-sm font-bold text-[var(--fg-primary)] leading-snug flex-1">{message}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel}
                className="flex-1 py-3 bg-[var(--bg-elevated)] text-[var(--fg-muted)] font-bold text-sm rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/80 transition-all">
                Annulla
              </button>
              <button onClick={onConfirm}
                className={`flex-[2] py-3 font-bold text-sm rounded-2xl transition-all ${danger ? 'bg-[var(--expense)] text-white hover:opacity-90' : 'bg-[var(--accent)] text-[var(--accent-on)] hover:shadow-[0_0_20px_var(--glow-accent)]'}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
