'use client'

import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import {
  Upload, CheckCircle2, AlertCircle, FileText, ArrowRight,
  ArrowLeft, Loader2, Sparkles, Banknote, CreditCard,
  Building2, Wallet, Bitcoin, RefreshCw, FileCheck, MoreHorizontal,
  X, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { processImport, getAccountsForImport } from '@/app/actions/import'
import { cn } from '@/lib/utils'

type CSVRow = Record<string, string>
type Mapping = { date: string; amount: string; description: string; payee: string }

// ── Metodi di pagamento ────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'DEBIT_CARD',    label: 'Carta di Debito',    icon: CreditCard,  color: '#3B8BF5' },
  { id: 'CREDIT_CARD',   label: 'Carta di Credito',   icon: CreditCard,  color: '#F43F5E' },
  { id: 'BANK_TRANSFER', label: 'Bonifico Bancario',  icon: Building2,   color: '#1DB9A6' },
  { id: 'CASH',          label: 'Contanti',            icon: Banknote,    color: '#4ADE80' },
  { id: 'PAYPAL',        label: 'PayPal',              icon: Wallet,      color: '#0070BA' },
  { id: 'CRYPTO',        label: 'Criptovalute',        icon: Bitcoin,     color: '#F7931A' },
  { id: 'DIRECT_DEBIT',  label: 'Addebito Diretto',   icon: RefreshCw,   color: '#FBBF24' },
  { id: 'CHECK',         label: 'Assegno',             icon: FileCheck,   color: '#94A3B8' },
  { id: 'OTHER',         label: 'Altro',               icon: MoreHorizontal, color: '#64748B' },
] as const

// ── Keyword per auto-detect ────────────────────────────────────
const DATE_KW   = ['data', 'date', 'dat', 'giorno', 'day', 'time', 'timestamp', 'valuta', 'value date']
const AMOUNT_KW = ['importo', 'amount', 'valore', 'value', 'dare', 'avere', 'saldo', 'totale', 'euro', 'eur', 'cifra', 'sum', 'addebito', 'accredito', 'movement']
const DESC_KW   = ['descr', 'causale', 'note', 'nota', 'riferim', 'detail', 'descript', 'motivo', 'oggetto', 'payment', 'memo', 'wording', 'narration']
const PAYEE_KW  = ['beneficiar', 'intestat', 'controparte', 'payee', 'destinat', 'mittent', 'creditore', 'debitore', 'merchant', 'pagante']

function scoreHeader(h: string, keywords: string[]): number {
  const low = h.toLowerCase()
  return keywords.some(k => low.includes(k)) ? 1 : 0
}

function autoDetect(headers: string[], rows: CSVRow[]): { mapping: Mapping; confidence: Record<keyof Mapping, number> } {
  const first = rows[0] ?? {}
  const isDateLike  = (v: string) => /^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(v.trim())
  const isAmountLike = (v: string) => /^[-+]?\s*[\d.,]+\s*€?$/.test(v.trim().replace(/\s/g, ''))

  const score = (h: string, kw: string[], valueFn?: (v: string) => boolean) => {
    let s = scoreHeader(h, kw) * 2
    if (valueFn && first[h] && valueFn(first[h])) s += 1
    return s
  }

  const ranked = (kw: string[], valueFn?: (v: string) => boolean) =>
    [...headers].sort((a, b) => score(b, kw, valueFn) - score(a, kw, valueFn))

  const dateH   = ranked(DATE_KW,   isDateLike)[0]   ?? ''
  const amountH = ranked(AMOUNT_KW, isAmountLike)[0] ?? ''
  const descH   = ranked(DESC_KW).find(h => h !== dateH && h !== amountH) ?? ''
  const payeeH  = ranked(PAYEE_KW).find(h => h !== dateH && h !== amountH && h !== descH) ?? ''

  const conf = (h: string, kw: string[]) => Math.min(100, scoreHeader(h, kw) ? 90 : 50)

  return {
    mapping: { date: dateH, amount: amountH, description: descH, payee: payeeH },
    confidence: {
      date:        conf(dateH,   DATE_KW),
      amount:      conf(amountH, AMOUNT_KW),
      description: conf(descH,   DESC_KW),
      payee:       conf(payeeH,  PAYEE_KW),
    },
  }
}

// ── Formato importo per preview ────────────────────────────────
function fmtAmount(raw: string) {
  const n = parseFloat(raw.replace(',', '.').replace(/[€$£\s.]/g, '').replace(',', '.'))
  if (isNaN(n)) return raw
  return n >= 0
    ? <span className="text-[var(--income)] font-bold">+{Math.abs(n).toFixed(2)} €</span>
    : <span className="text-[var(--expense)] font-bold">−{Math.abs(n).toFixed(2)} €</span>
}

// ── Componente principale ──────────────────────────────────────
export default function ImportPage() {
  const [step, setStep]               = useState<1|2|3>(1)
  const [file, setFile]               = useState<File|null>(null)
  const [dragging, setDragging]       = useState(false)
  const [data, setData]               = useState<CSVRow[]>([])
  const [headers, setHeaders]         = useState<string[]>([])
  const [mapping, setMapping]         = useState<Mapping>({ date:'', amount:'', description:'', payee:'' })
  const [confidence, setConfidence]   = useState<Record<keyof Mapping, number>>({ date:0, amount:0, description:0, payee:0 })
  const [accounts, setAccounts]       = useState<{id:string; name:string; type:string}[]>([])
  const [accountId, setAccountId]     = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('DEBIT_CARD')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult]           = useState<{success:boolean; importedCount:number; duplicateCount:number; errors:string[]}|null>(null)

  useEffect(() => {
    getAccountsForImport().then(list => {
      setAccounts(list)
      if (list.length > 0) setAccountId(list[0].id)
    })
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
    if (f && f.name.endsWith('.csv')) parseFile(f)
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
        date:        row[mapping.date]        ?? '',
        amount:      row[mapping.amount]      ?? '',
        description: row[mapping.description] ?? '',
        payee:       mapping.payee ? row[mapping.payee] : undefined,
      }))
      const res = await processImport(payload, { accountId, paymentMethod, fileName: file?.name })
      setResult(res)
    } catch (e: any) {
      alert(`Importazione fallita: ${e.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const reset = () => {
    setStep(1); setFile(null); setData([]); setHeaders([])
    setMapping({ date:'', amount:'', description:'', payee:'' })
    setResult(null)
  }

  // ── STEP 1: Upload ─────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Drag & Drop zone */}
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
        <h3 className="text-xl font-display font-bold text-[var(--fg-primary)] mb-2">
          {dragging ? 'Rilascia il file qui' : 'Trascina il CSV oppure clicca'}
        </h3>
        <p className="text-sm text-[var(--fg-muted)] mb-1">Formati supportati: CSV delle principali banche italiane</p>
        <p className="text-xs text-[var(--fg-subtle)]">Date: gg/mm/aaaa o aaaa-mm-gg · Importi: europeo o US · Max 10 MB</p>

        <input type="file" accept=".csv,.txt" id="csv-upload" className="hidden" onChange={handleFileInput} />
      </div>

      {/* Download template */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-[var(--fg-subtle)]" />
          <div>
            <p className="text-sm font-bold text-[var(--fg-primary)]">Template CSV di esempio</p>
            <p className="text-xs text-[var(--fg-muted)]">Scarica per vedere il formato consigliato</p>
          </div>
        </div>
        <a
          href="data:text/csv;charset=utf-8,Data,Importo,Descrizione,Beneficiario%0A11/03/2026,-45.50,Supermercato Conad,Conad%0A03/03/2026,1800.00,Stipendio Marzo,Azienda SRL%0A01/03/2026,-12.99,Netflix,Netflix"
          download="template-import.csv"
          onClick={e => e.stopPropagation()}
          className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-default)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all"
        >
          Scarica template
        </a>
      </div>

      {/* Info banche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Intesa Sanpaolo', 'UniCredit', 'Fineco', 'N26 / Revolut'].map(b => (
          <div key={b} className="p-3 rounded-xl border border-[var(--border-subtle)] text-center">
            <p className="text-xs font-bold text-[var(--fg-muted)]">{b}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ── STEP 2: Smart Mapping + Opzioni ───────────────────────────
  const ConfidenceBadge = ({ pct }: { pct: number }) => (
    <span className={cn(
      "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full",
      pct >= 80 ? "bg-[var(--income-dim)] text-[var(--income)]"
      : pct >= 50 ? "bg-[var(--warning-dim)] text-[var(--warning)]"
      : "bg-[var(--expense-dim)] text-[var(--expense)]"
    )}>
      {pct >= 80 ? '✓ Auto' : pct >= 50 ? '⚠ Verifica' : '✗ Manuale'}
    </span>
  )

  const renderStep2 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-6 duration-400">
      {/* Banner auto-detect */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent)]/20">
        <Sparkles size={18} className="text-[var(--accent)] shrink-0" />
        <p className="text-sm font-medium text-[var(--fg-primary)]">
          <span className="font-bold">Rilevamento automatico completato</span> — Verifica le colonne e correggi se necessario.
        </p>
      </div>

      {/* Mapping colonne */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[var(--fg-subtle)] mb-4">Mappatura Colonne</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { field: 'date',        label: 'Data *',           required: true },
            { field: 'amount',      label: 'Importo *',        required: true },
            { field: 'description', label: 'Descrizione *',    required: true },
            { field: 'payee',       label: 'Beneficiario',     required: false },
          ] as const).map(({ field, label, required }) => (
            <div key={field} className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">{label}</label>
                <ConfidenceBadge pct={confidence[field]} />
              </div>
              <div className="relative">
                <select
                  value={mapping[field]}
                  onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border appearance-none cursor-pointer font-medium text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--fg-primary)' }}
                >
                  <option value="">{required ? 'Seleziona colonna...' : 'Nessuno (opzionale)'}</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h} {data[0]?.[h] ? `→ "${data[0][h]}"` : ''}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fg-subtle)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selezione conto */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[var(--fg-subtle)] mb-3">Importa nel Conto</p>
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
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black", accountId === acc.id ? "bg-[var(--accent)] text-[var(--accent-on)]" : "bg-[var(--bg-elevated)] text-[var(--fg-muted)]")}>
                {acc.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-bold truncate", accountId === acc.id ? "text-[var(--accent)]" : "text-[var(--fg-primary)]")}>{acc.name}</p>
                <p className="text-[10px] text-[var(--fg-subtle)] uppercase">{acc.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Metodo pagamento default */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[var(--fg-subtle)] mb-3">Metodo di Pagamento (default per tutte le righe)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {PAYMENT_METHODS.map(pm => {
            const Icon = pm.icon
            const active = paymentMethod === pm.id
            return (
              <button
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all", active ? "border-[var(--accent)] bg-[var(--accent-dim)]" : "border-[var(--border-subtle)] hover:border-[var(--border-default)]")}
              >
                <Icon size={18} style={{ color: active ? 'var(--accent)' : pm.color }} />
                <span className={cn("text-[10px] font-bold leading-tight", active ? "text-[var(--accent)]" : "text-[var(--fg-muted)]")}>{pm.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>
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

  // ── STEP 3: Preview + Import ───────────────────────────────────
  const renderStep3 = () => {
    const preview = data.slice(0, 15)
    const selPm = PAYMENT_METHODS.find(p => p.id === paymentMethod)
    const selAcc = accounts.find(a => a.id === accountId)
    return (
      <div className="space-y-6 animate-in slide-in-from-right-6 duration-400">
        {/* Riepilogo impostazioni */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Righe totali',  val: data.length.toString() },
            { label: 'Conto',         val: selAcc?.name ?? '—' },
            { label: 'Pagamento',     val: selPm?.label ?? '—' },
            { label: 'Stato iniziale', val: 'Da verificare' },
          ].map(({ label, val }) => (
            <div key={label} className="p-3 rounded-2xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--fg-subtle)' }}>{label}</p>
              <p className="text-sm font-bold truncate" style={{ color: 'var(--fg-primary)' }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Tabella preview */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
                <tr>
                  {['Data', 'Descrizione', 'Importo'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t transition-colors hover:bg-[var(--bg-elevated)]/50" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{row[mapping.date]}</td>
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate" style={{ color: 'var(--fg-primary)' }}>{row[mapping.description]}</td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{fmtAmount(row[mapping.amount] ?? '')}</td>
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
          <button onClick={() => setStep(2)} disabled={isImporting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>
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
              : <><CheckCircle2 size={16} /> Importa {data.length} transazioni</>}
          </button>
        </div>
      </div>
    )
  }

  // ── RISULTATO ─────────────────────────────────────────────────
  const renderResult = () => (
    <div className="text-center py-10 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--income-dim)', boxShadow: '0 0 40px var(--glow-accent)' }}>
        <CheckCircle2 size={36} style={{ color: 'var(--income)' }} />
      </div>
      <h2 className="text-2xl font-display font-black mb-2" style={{ color: 'var(--fg-primary)' }}>Importazione Completata</h2>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>Le transazioni sono in stato "Da verificare" — confermale nella sezione Transazioni.</p>

      <div className="max-w-xs mx-auto space-y-2 mb-8">
        <div className="flex justify-between items-center p-3 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Importate</span>
          <span className="font-mono font-bold" style={{ color: 'var(--income)' }}>{result?.importedCount}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Duplicati saltati</span>
          <span className="font-mono font-bold" style={{ color: 'var(--warning)' }}>{result?.duplicateCount}</span>
        </div>
        {result?.errors && result.errors.length > 0 && (
          <div className="p-3 rounded-xl border text-left" style={{ background: 'var(--expense-dim)', borderColor: 'var(--expense)' }}>
            <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: 'var(--expense)' }}><AlertTriangle size={12} /> {result.errors.length} righe con errori</p>
            {result.errors.slice(0, 3).map((e, i) => <p key={i} className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{e}</p>)}
            {result.errors.length > 3 && <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>+{result.errors.length - 3} altri…</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={reset} className="px-6 py-3 rounded-xl font-bold text-sm border transition-all" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--fg-primary)' }}>
          Importa un altro file
        </button>
        <a href="/app/transactions" className="px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_var(--glow-accent)]" style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}>
          Vai alle Transazioni <ArrowRight size={15} />
        </a>
      </div>
    </div>
  )

  // ── LAYOUT ────────────────────────────────────────────────────
  const STEPS = ['Carica file', 'Configura', 'Importa']

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-400">
      {/* Header + stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--fg-primary)' }}>Importa CSV</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Rilevamento automatico colonne · Parsing multi-formato · Anti-duplicati</p>
        </div>

        {!result && (
          <div className="flex items-center gap-1.5 shrink-0">
            {STEPS.map((label, i) => {
              const s = i + 1
              const done = step > s
              const active = step === s
              return (
                <div key={s} className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                      active ? "scale-110 shadow-[0_0_12px_var(--glow-accent)]" : ""
                    )} style={{
                      background: done ? 'var(--income-dim)' : active ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: done ? 'var(--income)' : active ? 'var(--accent-on)' : 'var(--fg-subtle)',
                    }}>
                      {done ? <CheckCircle2 size={14} /> : s}
                    </div>
                    <span className="text-[10px] font-bold hidden sm:block" style={{ color: active ? 'var(--fg-primary)' : 'var(--fg-subtle)' }}>{label}</span>
                  </div>
                  {s < 3 && <div className="w-4 h-px mx-1.5 rounded" style={{ background: done ? 'var(--income)' : 'var(--border-subtle)' }} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Card principale */}
      <div className="p-6 md:p-10 rounded-[2rem] border shadow-xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
        {result
          ? renderResult()
          : step === 1 ? renderStep1()
          : step === 2 ? renderStep2()
          : renderStep3()
        }
      </div>
    </div>
  )
}
