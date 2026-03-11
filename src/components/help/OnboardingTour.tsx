'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const TOUR_KEY = 'finance-onboarding-v1'

const STEPS = [
  {
    emoji: '👋',
    title: 'Benvenuto nel Finance Tracker!',
    desc: 'Questo è il tuo strumento personale per tenere sotto controllo finanze, risparmi e investimenti. Ci vogliono 5 minuti per configurarlo.',
    tip: null,
    cta: null,
  },
  {
    emoji: '🏦',
    title: 'Crea i tuoi Conti',
    desc: 'Il primo passo è aggiungere i tuoi conti. Il tipo che scegli determina dove appaiono nel Patrimonio Netto.',
    tip: 'Corrente/Contanti → Liquidità · Deposito → Risparmi · Investimento → ETF/Crypto · Prestito/Mutuo → Debiti',
    cta: { label: 'Vai ai Conti', href: '/app/accounts' },
  },
  {
    emoji: '🏷️',
    title: 'Organizza le Categorie',
    desc: 'Le categorie servono per classificare ogni transazione (Alimentari, Trasporti, Stipendio…). Puoi creare gerarchie padre/figlio.',
    tip: 'Esempio: "Trasporti" come padre, poi "Benzina" e "Treno" come figli.',
    cta: { label: 'Vai alle Categorie', href: '/app/categories' },
  },
  {
    emoji: '💸',
    title: 'Aggiungi le Transazioni',
    desc: 'Registra entrate e uscite manualmente con il pulsante "Transazione Rapida" nel dashboard, oppure importa l\'estratto conto CSV della tua banca.',
    tip: 'Le transazioni importate arrivano come "Da verificare" e vanno confermate — così eviti di contare movimenti sbagliati.',
    cta: { label: 'Importa CSV', href: '/app/import' },
  },
  {
    emoji: '🔄',
    title: 'Configura i Pagamenti Ricorrenti',
    desc: 'Abbonamenti, affitto, bollette, stipendio: aggiungili una volta e si processano automaticamente ogni mese.',
    tip: 'Puoi impostare una "Data fine" per abbonamenti che scadono, come una promozione annuale.',
    cta: { label: 'Vai alle Ricorrenti', href: '/app/recurring' },
  },
  {
    emoji: '🎯',
    title: 'Imposta i Budget Mensili',
    desc: 'I budget sono limiti di spesa per categoria. Non alloci fondi fisici — sono semplicemente un tetto di controllo che ti avvisa se stai sforando.',
    tip: 'Verde < 75% · Giallo vicino al limite · Rosso = sforato. I budget vanno ricreati ogni mese (o copiati dal mese precedente).',
    cta: { label: 'Vai ai Budget', href: '/app/budget' },
  },
  {
    emoji: '📊',
    title: 'Analizza con i Report',
    desc: 'I report mostrano l\'andamento degli ultimi 6 mesi, le categorie di spesa principali e una proiezione del cash flow futuro basata sulle ricorrenti.',
    tip: 'Gli Insight AI analizzano automaticamente il tuo mese e ti danno suggerimenti personalizzati.',
    cta: { label: 'Vai ai Report', href: '/app/reports' },
  },
  {
    emoji: '🚀',
    title: 'Sei pronto!',
    desc: 'Hai tutto quello che ti serve. Puoi riaprire questa guida in qualsiasi momento cliccando il pulsante "?" nella barra laterale.',
    tip: 'Passa il mouse sulle voci del dashboard per vedere i tooltip con spiegazioni rapide.',
    cta: null,
  },
]

interface OnboardingTourProps {
  externalOpen?: boolean
  onExternalClose?: () => void
}

export default function OnboardingTour({ externalOpen, onExternalClose }: OnboardingTourProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(TOUR_KEY)) {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    if (externalOpen) {
      setStep(0)
      setOpen(true)
    }
  }, [externalOpen])

  const close = () => {
    setOpen(false)
    localStorage.setItem(TOUR_KEY, '1')
    onExternalClose?.()
  }

  const next = () => {
    if (step === STEPS.length - 1) { close(); return }
    setDirection(1)
    setStep(s => s + 1)
  }

  const prev = () => {
    setDirection(-1)
    setStep(s => s - 1)
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: direction * 40, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -direction * 40, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="glass bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl w-full max-w-md border border-[var(--border-default)] overflow-hidden"
      >
        {/* Progress bar */}
        <div className="w-full h-1 bg-[var(--bg-input)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Close */}
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={close}
            className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
          >
            <X size={14} />
            Salta
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 pt-2 space-y-5">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-6xl drop-shadow-md">{current.emoji}</div>
            <h2 className="text-2xl font-display font-black text-[var(--fg-primary)] tracking-tight leading-tight">
              {current.title}
            </h2>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed max-w-xs">
              {current.desc}
            </p>
          </div>

          {current.tip && (
            <div className="flex items-start gap-3 p-4 bg-[var(--accent-dim)]/30 border border-[var(--accent)]/20 rounded-2xl">
              <span className="text-lg shrink-0">💡</span>
              <p className="text-[11px] text-[var(--fg-primary)] leading-relaxed font-medium">
                {current.tip}
              </p>
            </div>
          )}

          {current.cta && (
            <a
              href={current.cta.href}
              onClick={close}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--fg-primary)] rounded-2xl font-bold text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
            >
              {current.cta.label} →
            </a>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between gap-4">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[var(--fg-muted)] font-bold text-sm rounded-2xl hover:bg-[var(--bg-elevated)] transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} />
            Indietro
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > step ? 1 : -1); setStep(i) }}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === step
                    ? 'w-5 h-2 bg-[var(--accent)]'
                    : i < step
                      ? 'w-2 h-2 bg-[var(--accent)]/40'
                      : 'w-2 h-2 bg-[var(--border-default)]'
                )}
              />
            ))}
          </div>

          <button
            onClick={next}
            className={cn(
              'flex items-center gap-1.5 px-5 py-2.5 font-bold text-sm rounded-2xl transition-all',
              isLast
                ? 'bg-[var(--accent)] text-[var(--accent-on)] hover:shadow-[0_0_20px_var(--glow-accent)]'
                : 'bg-[var(--bg-elevated)] text-[var(--fg-primary)] hover:bg-[var(--accent)] hover:text-[var(--accent-on)]'
            )}
          >
            {isLast ? (
              <><CheckCircle2 size={16} /> Inizia</>
            ) : (
              <>Avanti <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
