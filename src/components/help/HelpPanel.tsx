'use client'

import { X, LayoutDashboard, Wallet, PieChart, RefreshCw, ArrowLeftRight, BarChart3, Upload, Tag, Zap, Target, BookOpen, ChevronRight, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  label: string
  items: {
    icon: React.ReactNode
    title: string
    desc: string
    tips?: string[]
    href?: string
  }[]
}

const SECTIONS: Section[] = [
  {
    label: 'Panoramica',
    items: [
      {
        icon: <LayoutDashboard size={18} />,
        title: 'Dashboard',
        desc: 'La schermata principale. Mostra il patrimonio netto totale, le statistiche del mese selezionato (entrate, uscite, saldo), i budget attivi e le prossime scadenze.',
        tips: [
          'Usa il selettore del mese in alto a destra per navigare tra periodi diversi.',
          'Il patrimonio si aggiorna in tempo reale a ogni nuova transazione.',
        ],
      },
      {
        icon: <Wallet size={18} />,
        title: 'Patrimonio Netto',
        desc: 'Somma di tutti i saldi: conti correnti + risparmi + investimenti − debiti. Clicca sulla freccia per espandere il dettaglio.',
        tips: [
          'Liquidità: conti Corrente e Contanti.',
          'Risparmi: conti Deposito.',
          'Investimenti: conti di tipo Investimento (ETF, crypto, azioni).',
          'Debiti: Prestiti, Mutui.',
        ],
      },
    ],
  },
  {
    label: 'Operazioni',
    items: [
      {
        icon: <ArrowLeftRight size={18} />,
        title: 'Transazioni',
        desc: 'Ogni movimento di denaro. Le transazioni importate arrivano come "Da verificare" e devono essere confermate manualmente.',
        tips: [
          '"Da verificare" = transazioni da controllare prima che vengano conteggiate nelle statistiche.',
          'Le transazioni positive sono entrate, quelle negative uscite.',
        ],
        href: '/app/transactions',
      },
      {
        icon: <Upload size={18} />,
        title: 'Importa CSV',
        desc: 'Carica l\'estratto conto della tua banca in formato CSV. Il sistema tenta di riconoscere data, importo e descrizione automaticamente.',
        tips: [
          'Scarica il CSV dal portale della tua banca (solitamente nella sezione "Movimenti" o "Estratto conto").',
          'Le Regole possono categorizzare automaticamente le transazioni importate.',
        ],
        href: '/app/import',
      },
      {
        icon: <RefreshCw size={18} />,
        title: 'Ricorrenti',
        desc: 'Abbonamenti e pagamenti fissi che si ripetono automaticamente. Vengono processati ogni giorno e creano transazioni confermate.',
        tips: [
          'Puoi impostare una "Data fine" per abbonamenti a tempo determinato.',
          'Se una ricorrenza non ha un conto associato, non viene processata automaticamente.',
          'Il "Flusso Mensile Netto" in alto mostra entrate meno uscite mensili ricorrenti.',
        ],
        href: '/app/recurring',
      },
      {
        icon: <Zap size={18} />,
        title: 'Regole',
        desc: 'Classificazione automatica delle transazioni in base a parole chiave. Ogni regola può assegnare una categoria, aggiungere un tag o marcare come trasferimento.',
        tips: [
          'Priorità più bassa = si applica prima.',
          'Le regole vengono applicate alle transazioni importate in automatico.',
        ],
        href: '/app/rules',
      },
    ],
  },
  {
    label: 'Pianificazione',
    items: [
      {
        icon: <PieChart size={18} />,
        title: 'Budget',
        desc: 'Limiti mensili di spesa per categoria. Non alloca fondi fisici: è un tetto di controllo che ti avvisa quando stai per sforare.',
        tips: [
          'Verde < 75% · Giallo 75–100% · Rosso = sforato.',
          'I budget non si trascinano automaticamente al mese successivo — ricreali o usa il selettore mese per vedere quelli passati.',
          'Solo le transazioni CONFERMATE contano verso il budget.',
        ],
        href: '/app/budget',
      },
      {
        icon: <Target size={18} />,
        title: 'Obiettivi',
        desc: 'Traguardi di risparmio con importo e scadenza. La quota accantonata viene sottratta dalla "Liquidità Disponibile" nel dashboard.',
        tips: [
          'Associa un obiettivo a un conto specifico per tenere separati i fondi.',
          'L\'importo corrente si aggiorna manualmente.',
        ],
        href: '/app/goals',
      },
      {
        icon: <BarChart3 size={18} />,
        title: 'Report',
        desc: 'Grafici degli ultimi 6 mesi con confronto entrate/uscite/risparmio, proiezione del cash flow futuro basata sulle ricorrenze, e top categorie di spesa.',
        tips: [
          'La proiezione futura usa solo i pagamenti ricorrenti configurati.',
          'Le metriche (risparmio medio, mese migliore) si basano solo sui mesi con movimentazioni effettive.',
        ],
        href: '/app/reports',
      },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      {
        icon: <Wallet size={18} />,
        title: 'Conti',
        desc: 'I tuoi conti bancari, depositi, portafogli e debiti. Il tipo del conto determina dove appare nel breakdown del Patrimonio Netto.',
        tips: [
          'Corrente / Contanti → Liquidità immediata',
          'Deposito → Risparmi',
          'Investimento → Investimenti (ETF, crypto, azioni…)',
          'Prestito / Mutuo → Debiti e Passività',
        ],
        href: '/app/accounts',
      },
      {
        icon: <Tag size={18} />,
        title: 'Categorie',
        desc: 'Etichette assegnabili alle transazioni e ricorrenti per organizzare e analizzare le spese. Supportano gerarchia padre/figlio.',
        tips: [
          'Crea categorie figlio per avere analisi più granulari (es. "Alimentari" > "Supermercato").',
          'Le categorie vengono usate anche per filtrare i budget.',
        ],
        href: '/app/categories',
      },
    ],
  },
]

interface HelpPanelProps {
  open: boolean
  onClose: () => void
  onStartTour: () => void
}

export default function HelpPanel({ open, onClose, onStartTour }: HelpPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={cn(
        'fixed top-0 right-0 h-full z-[100] w-full max-w-[480px]',
        'bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-2xl',
        'flex flex-col transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-elevated)]/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--accent)] rounded-xl shadow-[0_0_15px_var(--glow-accent)]">
              <BookOpen size={18} className="text-[var(--accent-on)]" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-[var(--fg-primary)]">Guida alle funzionalità</h2>
              <p className="text-[10px] text-[var(--fg-muted)] font-medium">Passa il mouse sulle voci per i tooltip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4 px-1">
                {section.label}
              </p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="glass p-5 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--bg-elevated)] rounded-xl text-[var(--accent)] border border-[var(--border-subtle)] shrink-0">
                          {item.icon}
                        </div>
                        <h4 className="font-bold text-[var(--fg-primary)] text-sm">{item.title}</h4>
                      </div>
                      {item.href && (
                        <a
                          href={item.href}
                          onClick={onClose}
                          className="shrink-0 p-1.5 text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-colors"
                          title={`Vai a ${item.title}`}
                        >
                          <ChevronRight size={14} />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed mb-3">{item.desc}</p>
                    {item.tips && item.tips.length > 0 && (
                      <ul className="space-y-1">
                        {item.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-[10px] text-[var(--fg-subtle)]">
                            <span className="text-[var(--accent)] shrink-0 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--border-subtle)] shrink-0 bg-[var(--bg-elevated)]/20">
          <button
            onClick={() => { onClose(); onStartTour() }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-[var(--accent-on)] rounded-2xl font-bold text-sm hover:shadow-[0_0_25px_var(--glow-accent)] transition-all active:scale-[0.98]"
          >
            <Play size={16} />
            Rivedi il tour iniziale
          </button>
        </div>
      </div>
    </>
  )
}
