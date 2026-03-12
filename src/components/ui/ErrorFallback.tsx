'use client'

import { RefreshCcw, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/LottieAnimation'

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass p-10 rounded-[3rem] border border-red-500/20 max-w-md w-full bg-red-500/5 shadow-2xl shadow-red-500/5"
      >
        <div className="flex justify-center mb-2">
          <LottieAnimation animation="warning" className="w-32 h-32" loop={false} />
        </div>
        
        <h2 className="text-2xl font-display font-black text-[var(--fg-primary)] mb-2">Ops! Qualcosa è andato storto</h2>
        <p className="text-sm text-[var(--fg-muted)] mb-8 font-medium leading-relaxed">
          Si è verificato un errore imprevisto. Abbiamo segnalato il problema al team tecnico.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-black/40 rounded-2xl border border-white/5 text-left overflow-auto max-h-32 custom-scrollbar">
            <p className="text-[10px] font-mono text-red-400 break-all">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg active:scale-95"
          >
            <RefreshCcw size={18} />
            Riprova
          </button>
          
          <a
            href="/app/dashboard"
            className="flex items-center justify-center gap-2 w-full py-4 bg-[var(--bg-elevated)] text-[var(--fg-primary)] rounded-2xl font-bold text-sm border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-all active:scale-95"
          >
            <Home size={18} />
            Torna alla Dashboard
          </a>
        </div>

        {error.digest && (
          <p className="mt-6 text-[9px] font-black text-[var(--fg-subtle)] uppercase tracking-widest opacity-50">
            Error ID: {error.digest}
          </p>
        )}
      </motion.div>
    </div>
  )
}
