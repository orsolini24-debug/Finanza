'use client'

import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import {
  Upload, CheckCircle2, AlertCircle, FileText, ArrowRight,
  ArrowLeft, Loader2, Info, History, Trash2,
  AlertTriangle, ChevronDown, Package,
} from 'lucide-react'
import { processImport, getAccountsForImport, getImportHistory, deleteImportBatch } from '@/app/actions/import'
import { cn } from '@/lib/utils'

type ImportBatchSummary = {
  id: string
  fileName: string
  sourceType: string
  accountName: string
  rowCount: number
  createdAt: string
}

type CSVRow = Record<string, string>
type Mapping = {
  date:          string
  amount:        string
  description:   string
  counterpart:   string
  paymentMethod: string
}

type ConfidenceLevel = 'certain' | 'probable' | 'uncertain' | 'none'
type FieldConfidence = {
  level:  ConfidenceLevel
  pct:    number
  reason: string
}

// ── Riferimento colonna Excel (0-based → A, B, C, … Z, AA, …) ──
function colLetter(idx: number): string {
  let s = ''
  let i = idx + 1
  while (i > 0) {
    s = String.fromCharCode(65 + ((i - 1) % 26)) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

// ── Keyword con peso (score) per auto-detect ────────────────────
// "saldo" è escluso da KW_AMOUNT → è il saldo progressivo, non il movimento
type KWEntry = [string, number]  // [pattern, score]

const KW_DATE: KWEntry[] = [
  ['data operazione', 4], ['data contabile', 4], ['data mov', 4],
  ['data esec', 4], ['data val', 3],
  ['data', 3], ['date', 3],
  ['giorno', 2], ['day', 2], ['timestamp', 2],
  ['dat', 1],
]
const KW_AMOUNT: KWEntry[] = [
  ['importo', 4], ['amount', 4],
  ['addebito', 3], ['accredito', 3], ['moviment', 3],
  ['dare', 2], ['avere', 2], ['cifra', 2], ['sum', 2],
  ['valore', 1], ['totale', 1],
]
const KW_DESC: KWEntry[] = [
  ['causale', 4], ['descrizione', 4], ['description', 4],
  ['narration', 3], ['wording', 3], ['descript', 3],
  ['note', 3], ['nota', 3], ['motivo', 3],
  ['riferim', 2], ['detail', 2], ['memo', 2], ['oggetto', 2],
  ['payment info', 2], ['info', 1],
]
const KW_COUNTERPART: KWEntry[] = [
  ['controparte', 4], ['beneficiar', 4], ['ordinante', 4],
  ['merchant', 3], ['intestat', 3], ['payee', 3],
  ['destinat', 2], ['mittent', 2], ['creditore', 2], ['debitore', 2],
  ['nome', 1],
]
const KW_PAYMENT_METHOD: KWEntry[] = [
  ['metodo pagamento', 4], ['payment method', 4],
  ['modalita', 3], ['tipo pagam', 3],
  ['canale', 2], ['channel', 2], ['tipo operaz', 2],
]

function scoreField(header: string, keywords: KWEntry[]): number {
  const low = header.toLowerCase()
  let best = 0
  for (const [pattern, pts] of keywords) {
    if (low === pattern)       { best = Math.max(best, pts + 2); break } // exact match bonus
    if (low.includes(pattern)) { best = Math.max(best, pts) }
  }
  return best
}

function sampleValues(rows: CSVRow[], header: string, n = 5): string[] {
  return rows.slice(0, n).map(r => (r[header] ?? '').trim()).filter(Boolean)
}

const isDateLike = (v: string) =>
  /^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(v) ||
  /^\d{4}-\d{2}-\d{2}/.test(v)

const isAmountLike = (v: string) => {
  const clean = v.replace(/[€$£\s]/g, '').replace(',', '.')
  const n = parseFloat(clean.replace(/,/g, ''))
  return !isNaN(n) && Math.abs(n) < 1_000_000
}

function buildConfidence(kwScore: number, valueMatch: boolean): FieldConfidence {
  const total = kwScore + (valueMatch ? 2 : 0)
  if (total >= 5) return { level: 'certain',  pct: 95, reason: 'Riconosciuto con certezza dal nome colonna e dal contenuto' }
  if (total >= 3) return { level: 'probable', pct: 70, reason: 'Ipotizzato dal nome della colonna — verifica che sia corretto prima di procedere' }
  if (total >= 1) return { level: 'uncertain', pct: 35, reason: 'Corrispondenza debole: il sistema non è sicuro. Conferma o cambia la selezione' }
  return            { level: 'none',     pct: 0,  reason: 'Campo non rilevato automaticamente — selezione manuale richiesta' }
}

function autoDetect(headers: string[], rows: CSVRow[]): {
  mapping: Mapping
  confidence: Record<keyof Mapping, FieldConfidence>
} {
  type Candidate = { h: string; kwScore: number; valMatch: boolean; conf: FieldConfidence }

  const candidates = (kws: KWEntry[], valueFn?: (v: string) => boolean, exclude: string[] = []): Candidate[] =>
    headers
      .filter(h => !exclude.includes(h))
      .map(h => {
        const kwScore  = scoreField(h, kws)
        const vals     = sampleValues(rows, h)
        const valMatch = valueFn ? vals.some(valueFn) : false
        return { h, kwScore, valMatch, conf: buildConfidence(kwScore, valMatch) }
      })
      .sort((a, b) => b.conf.pct - a.conf.pct)

  const dateCands   = candidates(KW_DATE,           isDateLike)
  const dateH       = dateCands[0]?.h ?? ''
  const dateConf    = dateCands[0]?.conf ?? buildConfidence(0, false)

  const amtCands    = candidates(KW_AMOUNT,          isAmountLike, [dateH])
  const amountH     = amtCands[0]?.h ?? ''
  const amountConf  = amtCands[0]?.conf ?? buildConfidence(0, false)

  const descCands   = candidates(KW_DESC,            undefined, [dateH, amountH])
  const descH       = descCands[0]?.h ?? ''
  const descConf    = descCands[0]?.conf ?? buildConfidence(0, false)

  const cpCands     = candidates(KW_COUNTERPART,     undefined, [dateH, amountH, descH])
  const cpH         = (cpCands[0]?.conf.pct ?? 0) > 0 ? cpCands[0]!.h : ''
  const cpConf: FieldConfidence = cpH
    ? cpCands[0]!.conf
    : { level: 'none', pct: 0, reason: 'Campo opzionale — seleziona se presente nel file' }

  const pmCands     = candidates(KW_PAYMENT_METHOD,  undefined, [dateH, amountH, descH, cpH])
  const pmH         = (pmCands[0]?.conf.pct ?? 0) > 0 ? pmCands[0]!.h : ''
  const pmConf: FieldConfidence = pmH
    ? pmCands[0]!.conf
    : { level: 'none', pct: 0, reason: 'Nessuna colonna rilevata — il metodo resterà vuoto e sarà assegnabile riga per riga in revisione' }

  return {
    mapping: { date: dateH, amount: amountH, description: descH, counterpart: cpH, paymentMethod: pmH },
    confidence: { date: dateConf, amount: amountConf, description: descConf, counterpart: cpConf, paymentMethod: pmConf },
  }
}

// ── Formattazione importo per preview ───────────────────────────
function fmtAmount(raw: string) {
  if (!raw) return <span style={{ color: 'var(--fg-subtle)' }}>—</span>
  let s = raw.trim().replace(/[€$£\s]/g, '')
  if (s.endsWith('-')) s = '-' + s.slice(0, -1)
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else if (lastDot > lastComma) s = s.replace(/,/g, '')
  else s = s.replace(',', '.')
  const n = parseFloat(s)
  if (isNaN(n)) return <span style={{ color: 'var(--fg-muted)' }}>{raw}</span>
  return n >= 0
    ? <span className="text-[var(--income)] font-bold">+{Math.abs(n).toFixed(2)} €</span>
    : <span className="text-[var(--expense)] font-bold">−{Math.abs(n).toFixed(2)} €</span>
}

// ── Componente principale ───────────────────────────────────────
export default function ImportPage() {
  const [activeTab, setActiveTab]   = useState<'import' | 'history'>('import')
  const [step, setStep]             = useState<1|2|3>(1)
  const [file, setFile]             = useState<File|null>(null)
  const [dragging, setDragging]     = useState(false)
  const [data, setData]             = useState<CSVRow[]>([])
  const [headers, setHeaders]       = useState<string[]>([])
  const [mapping, setMapping]       = useState<Mapping>({
    date: '', amount: '', description: '', counterpart: '', paymentMethod: '',
  })
  const [confidence, setConfidence] = useState<Record<keyof Mapping, FieldConfidence>>({
    date:          { level: 'none', pct: 0, reason: '' },
    amount:        { level: 'none', pct: 0, reason: '' },
    description:   { level: 'none', pct: 0, reason: '' },
    counterpart:   { level: 'none', pct: 0, reason: '' },
    paymentMethod: { level: 'none', pct: 0, reason: '' },
  })
  const [accounts, setAccounts]     = useState<{id:string; name:string; type:string}[]>([])
  const [accountId, setAccountId]   = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult]         = useState<{
    success: boolean; importedCount: number; duplicateCount: number; errors: string[]
  }|null>(null)

  // Storico import
  const [history, setHistory]           = useState<ImportBatchSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deletingBatch, setDeletingBatch]   = useState<string|null>(null)

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const h = await getImportHistory()
      setHistory(h)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (!confirm(`Eliminare l'import "${fileName}"?\n\nLe transazioni ancora in stato "Da confermare" verranno eliminate. Quelle già confermate rimarranno.`)) return
    setDeletingBatch(batchId)
    try {
      await deleteImportBatch(batchId)
      setHistory(prev => prev.filter(b => b.id !== batchId))
    } catch (e: any) {
      alert(`Errore: ${e.message}`)
    } finally {
      setDeletingBatch(null)
    }
  }

  useEffect(() => {
    getAccountsForImport().then(list => {
      setAccounts(list)
      if (list.length > 0) setAccountId(list[0].id)
    })
    loadHistory()
  }, [])

  const parseFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { alert('File troppo grande. Max 10 MB.'); return }
    setFile(f)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as CSVRow[]
        if (rows.length === 0) { alert('Il CSV non contiene righe dati.'); return }
        const hdrs = res.meta.fields ?? []
        const { mapping: m, confidence: c } = autoDetect(hdrs, rows)
        setData(rows)
        setHeaders(hdrs)
        setMapping(m)
        setConfidence(c)
        setStep(2)
      },
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) parseFile(f)
    else alert('Trascina un file .csv')
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const payload = data.map(row => ({
        date:          row[mapping.date]          ?? '',
        amount:        row[mapping.amount]        ?? '',
        description:   row[mapping.description]  ?? '',
        payee:         mapping.counterpart   ? row[mapping.counterpart]   : undefined,
        paymentMethod: mapping.paymentMethod ? row[mapping.paymentMethod] : undefined,
      }))
      const res = await processImport(payload, { accountId, fileName: file?.name })
      setResult(res)
      loadHistory()  // aggiorna storico dopo import
    } catch (e: any) {
      alert(`Importazione fallita: ${e.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const reset = () => {
    setStep(1); setFile(null); setData([]); setHeaders([])
    setMapping({ date: '', amount: '', description: '', counterpart: '', paymentMethod: '' })
    setResult(null)
  }

  // ── Confidence badge ────────────────────────────────────────
  const ConfidenceBadge = ({ conf }: { conf: FieldConfidence }) => {
    const cfg = {
      certain:  { label: '✓ Certo',    cls: 'bg-[var(--income-dim)] text-[var(--income)]' },
      probable: { label: '⚠ Verifica', cls: 'bg-[var(--warning-dim)] text-[var(--warning)]' },
      uncertain:{ label: '⚠ Incerto',  cls: 'bg-[var(--expense-dim)] text-[var(--expense)]' },
      none:     { label: '✗ Manuale',  cls: 'bg-[var(--bg-elevated)] text-[var(--fg-subtle)]' },
    }[conf.level]
    return (
      <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full', cfg.cls)}>
        {cfg.label}
      </span>
    )
  }

  // ── Select colonna con riferimento Excel ────────────────────
  const ColSelect = ({
    field, label, required = false,
  }: { field: keyof Mapping; label: string; required?: boolean }) => {
    const conf = confidence[field]
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between ml-1">
          <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">{label}</label>
          <ConfidenceBadge conf={conf} />
        </div>

        {/* Motivazione inline (solo per campi non certi) */}
        {conf.level !== 'certain' && conf.reason && (
          <p className="text-[9px] ml-1 leading-snug" style={{ color: 'var(--fg-subtle)' }}>
            {conf.reason}
          </p>
        )}

        <div className="relative">
          <select
            value={mapping[field]}
            onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full px-4 py-3 rounded-2xl border appearance-none cursor-pointer font-medium text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{ background: 'var(--bg-input)', borderColor: conf.level === 'uncertain' || conf.level === 'none' && required ? 'var(--expense)' : 'var(--border-default)', color: 'var(--fg-primary)' }}
          >
            <option value="">{required ? '— Seleziona colonna —' : '— Nessuno (opzionale) —'}</option>
            {headers.map((h, i) => {
              const letter = colLetter(i)
              const sample = data[0]?.[h] ?? ''
              const preview = sample.length > 22 ? sample.slice(0, 22) + '…' : sample
              return (
                <option key={h} value={h}>
                  {letter} — {h}{preview ? `  (es. "${preview}")` : ''}
                </option>
              )
            })}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fg-subtle)]" />
        </div>
      </div>
    )
  }

  // ── STEP 1: Upload ──────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-8">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center p-12 md:p-16 rounded-[2.5rem] border-2 border-dashed transition-all duration-300 cursor-pointer group",
          dragging
            ? "border-[var(--accent)] bg-[var(--accent-dim)] scale-[1.01]"
            : "border-[var(--border-default)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
        )}
        onClick={() => document.getElementById('csv-upload')?.click()}
      >
        <div className={cn(
          "w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 transition-all duration-500",
          dragging ? "bg-[var(--accent)] scale-110" : "bg-[var(--bg-elevated)] group-hover:bg-[var(--accent-dim)] group-hover:scale-105"
        )}>
          <Upload size={32} className={dragging ? "text-[var(--accent-on)]" : "text-[var(--accent)]"} />
        </div>
        <h3 className="text-xl font-display font-bold mb-2" style={{ color: 'var(--fg-primary)' }}>
          {dragging ? 'Rilascia il file qui' : 'Trascina il CSV oppure clicca'}
        </h3>
        <p className="text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>CSV delle principali banche italiane ed europee</p>
        <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Date: gg/mm/aaaa o aaaa-mm-gg · Importi: formato europeo o US · Max 10 MB</p>
        <input type="file" accept=".csv,.txt" id="csv-upload" className="hidden" onChange={handleFileInput} />
      </div>

      {/* Template */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-[var(--fg-subtle)]" />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--fg-primary)' }}>Template CSV di esempio</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Scarica per vedere il formato consigliato</p>
          </div>
        </div>
        <a
          href="data:text/csv;charset=utf-8,Data,Importo,Descrizione,Controparte%0A11/03/2026,-45.50,Acquisto supermercato,Conad%0A03/03/2026,1800.00,Stipendio Marzo,Azienda SRL%0A01/03/2026,-12.99,Abbonamento streaming,Netflix"
          download="template-import.csv"
          onClick={e => e.stopPropagation()}
          className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-default)] hover:bg-[var(--accent-dim)] transition-all"
          style={{ color: 'var(--accent)' }}
        >
          Scarica template
        </a>
      </div>

      {/* Banche compatibili */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Intesa Sanpaolo', 'UniCredit', 'Fineco', 'N26 · Revolut'].map(b => (
          <div key={b} className="p-3 rounded-xl border border-[var(--border-subtle)] text-center">
            <p className="text-xs font-bold" style={{ color: 'var(--fg-muted)' }}>{b}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ── STEP 2: Mapping ─────────────────────────────────────────
  // Conta campi obbligatori non certi
  const mandatoryFields: (keyof Mapping)[] = ['date', 'amount', 'description']
  const warningCount = mandatoryFields.filter(f => confidence[f].level !== 'certain').length

  const renderStep2 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-400">

      {/* Banner stato rilevamento */}
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-2xl border",
        warningCount === 0
          ? "bg-[var(--income-dim)] border-[var(--income)]/20"
          : "bg-[var(--warning-dim)] border-[var(--warning)]/20"
      )}>
        {warningCount === 0
          ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--income)' }} />
          : <AlertCircle  size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
        }
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--fg-primary)' }}>
            {warningCount === 0
              ? 'Tutti i campi obbligatori riconosciuti con certezza'
              : `${warningCount} campo${warningCount > 1 ? 'i' : ''} obbligator${warningCount > 1 ? 'i' : 'io'} da verificare`
            }
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            {warningCount === 0
              ? 'Controlla comunque la mappatura e correggi se necessario prima di procedere.'
              : 'I campi marcati ⚠ sono stati ipotizzati o non rilevati — la motivazione è indicata sotto ogni campo. Verifica e correggi prima di procedere.'
            }
          </p>
        </div>
      </div>

      {/* Colonne obbligatorie */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--fg-subtle)' }}>
          Campi Obbligatori
        </p>
        <p className="text-[10px] mb-4" style={{ color: 'var(--fg-subtle)' }}>
          Le colonne usano i riferimenti Excel (A, B, C…) come nel foglio di calcolo
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ColSelect field="date"        label="Data *"         required />
          <ColSelect field="amount"      label="Importo *"      required />
          <ColSelect field="description" label="Descrizione *"  required />
        </div>
      </div>

      {/* Colonne opzionali */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--fg-subtle)' }}>
          Campi Opzionali
        </p>
        <p className="text-[10px] mb-4" style={{ color: 'var(--fg-subtle)' }}>
          Seleziona se presenti nel file
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColSelect field="counterpart"   label="Controparte" />
          <ColSelect field="paymentMethod" label="Metodo di Pagamento" />
        </div>

        {/* Nota metodo pagamento */}
        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <Info size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--fg-subtle)' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            <span className="font-bold">Metodo di pagamento:</span>{' '}
            uno stesso estratto conto può contenere carta, bonifico, contanti e PayPal nella stessa lista.
            Se la tua banca esporta il metodo come colonna, mappalo qui e sarà assegnato riga per riga.
            Altrimenti il campo resterà vuoto e potrai compilarlo in revisione, transazione per transazione.
            Nessun metodo viene mai applicato globalmente all'intero import.
          </p>
        </div>
      </div>

      {/* Selezione conto */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--fg-subtle)' }}>
          Importa nel Conto *
        </p>
        {accounts.length === 0
          ? <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Nessun conto trovato. Crea prima un conto nella sezione Conti.</p>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setAccountId(acc.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all",
                    accountId === acc.id
                      ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                    accountId === acc.id ? "bg-[var(--accent)] text-[var(--accent-on)]" : "bg-[var(--bg-elevated)] text-[var(--fg-muted)]"
                  )}>
                    {acc.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold truncate", accountId === acc.id ? "text-[var(--accent)]" : "text-[var(--fg-primary)]")}>
                      {acc.name}
                    </p>
                    <p className="text-[10px] uppercase" style={{ color: 'var(--fg-subtle)' }}>{acc.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        }
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
        >
          <ArrowLeft size={15} /> Indietro
        </button>
        <button
          disabled={!mapping.date || !mapping.amount || !mapping.description || !accountId}
          onClick={() => setStep(3)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:shadow-[0_0_20px_var(--glow-accent)]"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          Anteprima <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )

  // ── STEP 3: Preview + Importa ───────────────────────────────
  const renderStep3 = () => {
    const preview   = data.slice(0, 15)
    const selAcc    = accounts.find(a => a.id === accountId)
    const hasCp     = !!mapping.counterpart
    const hasPM     = !!mapping.paymentMethod
    const pmColLabel = hasPM ? `Da colonna ${colLetter(headers.indexOf(mapping.paymentMethod))} (per riga)` : 'Vuoto — da assegnare in revisione'

    return (
      <div className="space-y-6 animate-in slide-in-from-right-6 duration-400">
        {/* Riepilogo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Righe totali',      val: data.length.toString() },
            { label: 'Conto destinazione', val: selAcc?.name ?? '—' },
            { label: 'Metodo pagamento',   val: pmColLabel },
            { label: 'Stato iniziale',     val: 'STAGED (da verificare)' },
          ].map(({ label, val }) => (
            <div key={label} className="p-3 rounded-2xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--fg-subtle)' }}>{label}</p>
              <p className="text-sm font-bold leading-snug" style={{ color: 'var(--fg-primary)' }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Tabella preview */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
                <tr>
                  {['#', 'Data', 'Descrizione', hasCp ? 'Controparte' : null, 'Importo'].filter(Boolean).map(h => (
                    <th key={h!} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-[var(--bg-elevated)]/50 transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-3 text-[10px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{i + 1}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{row[mapping.date] ?? '—'}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate" style={{ color: 'var(--fg-primary)' }}>{row[mapping.description] ?? '—'}</td>
                    {hasCp && (
                      <td className="px-4 py-3 text-xs max-w-[120px] truncate" style={{ color: 'var(--fg-muted)' }}>
                        {row[mapping.counterpart] || '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                      {fmtAmount(row[mapping.amount] ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 15 && (
            <div className="px-4 py-2 border-t text-center text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--fg-subtle)' }}>
              + {data.length - 15} righe aggiuntive verranno importate
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <button
            onClick={() => setStep(2)}
            disabled={isImporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            <ArrowLeft size={15} /> Indietro
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-extrabold text-sm disabled:opacity-50 transition-all hover:shadow-[0_0_24px_var(--glow-accent)] active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
          >
            {isImporting
              ? <><Loader2 size={16} className="animate-spin" /> Importazione in corso…</>
              : <><CheckCircle2 size={16} /> Importa {data.length} transazioni</>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Risultato ──────────────────────────────────────────────
  const renderResult = () => (
    <div className="text-center py-10 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'var(--income-dim)', boxShadow: '0 0 40px var(--glow-accent)' }}>
        <CheckCircle2 size={36} style={{ color: 'var(--income)' }} />
      </div>
      <h2 className="text-2xl font-display font-black mb-2" style={{ color: 'var(--fg-primary)' }}>
        Importazione Completata
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
        Le transazioni sono in stato STAGED (da verificare) — confermale nella sezione Transazioni.
      </p>

      <div className="max-w-xs mx-auto space-y-2 mb-8">
        <div className="flex justify-between items-center p-3 rounded-xl border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Importate</span>
          <span className="font-mono font-bold" style={{ color: 'var(--income)' }}>{result?.importedCount}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Duplicati saltati</span>
          <span className="font-mono font-bold" style={{ color: 'var(--warning)' }}>{result?.duplicateCount}</span>
        </div>
        {result?.errors && result.errors.length > 0 && (
          <div className="p-3 rounded-xl border text-left"
            style={{ background: 'var(--expense-dim)', borderColor: 'var(--expense)' }}>
            <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: 'var(--expense)' }}>
              <AlertTriangle size={12} /> {result.errors.length} righe con errori
            </p>
            {result.errors.slice(0, 3).map((e, i) => (
              <p key={i} className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{e}</p>
            ))}
            {result.errors.length > 3 && (
              <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>+{result.errors.length - 3} altri…</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl font-bold text-sm border transition-all"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--fg-primary)' }}
        >
          Importa un altro file
        </button>
        <a
          href="/app/transactions"
          className="px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_var(--glow-accent)]"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          Vai alle Transazioni <ArrowRight size={15} />
        </a>
      </div>
    </div>
  )

  // ── Storico Import ──────────────────────────────────────────
  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      {historyLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)' }}>
            <Package size={24} style={{ color: 'var(--fg-subtle)' }} />
          </div>
          <p className="font-bold" style={{ color: 'var(--fg-muted)' }}>Nessun import effettuato</p>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-subtle)' }}>Importa un file CSV per vederlo qui</p>
        </div>
      ) : (
        history.map(batch => (
          <div
            key={batch.id}
            className="flex items-center justify-between p-4 rounded-2xl border transition-all hover:border-[var(--border-default)]"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-dim)' }}>
                <FileText size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--fg-primary)' }}>{batch.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--fg-subtle)' }}>
                    {batch.accountName}
                  </span>
                  <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                    {batch.rowCount} righe
                  </span>
                  <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                    {new Date(batch.createdAt).toLocaleString('it-IT', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeleteBatch(batch.id, batch.fileName)}
              disabled={deletingBatch === batch.id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 shrink-0 ml-3"
              style={{
                background: 'var(--expense-dim)',
                borderColor: 'rgba(var(--expense-rgb, 248,113,113),0.2)',
                color: 'var(--expense)'
              }}
              title="Elimina import (le transazioni non confermate verranno eliminate)"
            >
              {deletingBatch === batch.id
                ? <Loader2 size={13} className="animate-spin" />
                : <Trash2 size={13} />
              }
              <span className="hidden sm:inline">Elimina</span>
            </button>
          </div>
        ))
      )}
    </div>
  )

  // ── Layout ─────────────────────────────────────────────────
  const STEPS = ['Carica file', 'Configura', 'Importa']

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-400">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--fg-primary)' }}>
            Importa CSV
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Rilevamento intelligente · Riferimenti Excel A/B/C · Metodo per riga · Anti-duplicati
          </p>
        </div>

        {/* Stepper (solo in tab import, non in storico) */}
        {activeTab === 'import' && !result && (
          <div className="flex items-center gap-1.5 shrink-0">
            {STEPS.map((label, i) => {
              const s = i + 1
              const done   = step > s
              const active = step === s
              return (
                <div key={s} className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                        active ? "scale-110 shadow-[0_0_12px_var(--glow-accent)]" : ""
                      )}
                      style={{
                        background: done ? 'var(--income-dim)' : active ? 'var(--accent)' : 'var(--bg-elevated)',
                        color: done ? 'var(--income)' : active ? 'var(--accent-on)' : 'var(--fg-subtle)',
                      }}
                    >
                      {done ? <CheckCircle2 size={14} /> : s}
                    </div>
                    <span
                      className="text-[10px] font-bold hidden sm:block"
                      style={{ color: active ? 'var(--fg-primary)' : 'var(--fg-subtle)' }}
                    >
                      {label}
                    </span>
                  </div>
                  {s < 3 && (
                    <div className="w-4 h-px mx-1.5 rounded" style={{ background: done ? 'var(--income)' : 'var(--border-subtle)' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
        {([
          { id: 'import',  label: 'Nuovo Import', icon: Upload },
          { id: 'history', label: `Storico${history.length > 0 ? ` (${history.length})` : ''}`, icon: History },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === id
                ? "shadow-sm"
                : "hover:bg-[var(--bg-surface)]"
            )}
            style={{
              background: activeTab === id ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === id ? 'var(--fg-primary)' : 'var(--fg-muted)',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Card principale */}
      <div
        className="p-6 md:p-10 rounded-[2rem] border shadow-xl"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        {activeTab === 'history'
          ? renderHistory()
          : result
            ? renderResult()
            : step === 1 ? renderStep1()
            : step === 2 ? renderStep2()
            : renderStep3()
        }
      </div>
    </div>
  )
}
