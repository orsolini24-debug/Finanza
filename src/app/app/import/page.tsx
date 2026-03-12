'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Papa from 'papaparse'
import {
  Upload, CheckCircle2, AlertCircle, FileText, ArrowRight,
  ArrowLeft, Loader2, Info, History, Trash2,
  AlertTriangle, ChevronDown, Package, Sparkles, Tag,
} from 'lucide-react'
import { processImport, getAccountsForImport, getImportHistory, deleteImportBatch } from '@/app/actions/import'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'
import { useRouter } from 'next/navigation'

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
  bankCategory:  string
}

type ConfidenceLevel = 'certain' | 'probable' | 'uncertain' | 'none'
type FieldConfidence = {
  level:  ConfidenceLevel
  pct:    number
  reason: string
}

// Formato banca rilevato automaticamente
type BankFormat = 'sella' | 'bpm' | 'generic'
const BANK_FORMAT_LABEL: Record<BankFormat, string> = {
  sella:   'BBVA / formato Causale+Movimento',
  bpm:     'Intesa Sanpaolo / formato Operazione+Categoria',
  generic: 'Generico',
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

// ── Trova la riga header reale ─────────────────
const BANKING_KEYWORDS_EXACT = new Set([
  'data', 'importo', 'causale', 'movimento', 'operazione', 'categoria',
  'descrizione', 'valuta', 'saldo', 'beneficiario', 'controparte',
  'addebito', 'accredito', 'dettagli', 'contabilizzazione',
  'data valuta', 'data contabile', 'data operazione',
  'amount', 'date', 'description', 'balance',
])

function findHeaderRow(rawRows: string[][]): number {
  for (let i = 0; i < Math.min(rawRows.length, 40); i++) {
    const row = rawRows[i]
    const hits = row.filter(cell => {
      const lc = cell.trim().toLowerCase()
      return lc.length > 0 && BANKING_KEYWORDS_EXACT.has(lc)
    }).length
    if (hits >= 2) return i
  }
  for (let i = 0; i < Math.min(rawRows.length, 40); i++) {
    if (rawRows[i].filter(c => c.trim()).length >= 3) return i
  }
  return 0
}

function detectBankFormat(hdrs: string[]): BankFormat {
  const lh = hdrs.map(h => h.toLowerCase().trim())
  if (lh.includes('causale') && lh.includes('movimento') && lh.includes('beneficiario')) return 'sella'
  if (lh.includes('operazione') && lh.includes('contabilizzazione')) return 'bpm'
  return 'generic'
}

function getBankAutoMapping(fmt: BankFormat, hdrs: string[]): Partial<Mapping> {
  const find = (name: string) => hdrs.find(h => h.toLowerCase().trim() === name) ?? ''
  if (fmt === 'sella') {
    return { date: find('data'), amount: find('importo'), description: find('causale'), counterpart: find('movimento') }
  }
  if (fmt === 'bpm') {
    return { date: find('data'), amount: find('importo'), description: find('operazione'), counterpart: find('dettagli'), bankCategory: hdrs.find(h => h.toLowerCase().trim() === 'categoria') ?? '' }
  }
  return {}
}

const DATE_PATTERN = /^\d{1,4}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?/
const isDateLike = (v: string) => DATE_PATTERN.test(v.trim()) || /^\d{4}-\d{2}-\d{2}/.test(v.trim())

const isAmountLike = (v: string): boolean => {
  const trimmed = v.trim()
  if (!trimmed || DATE_PATTERN.test(trimmed)) return false
  let s = trimmed.replace(/[€$£\s]/g, '')
  s = s.replace(/\b(EUR|USD|GBP|CHF|JPY|SEK|NOK|DKK|PLN|CZK|HUF|RON|AUD|CAD)\b/gi, '').trim()
  if (!s) return false
  if (s.endsWith('-')) s = '-' + s.slice(0, -1)
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else if (lastDot > lastComma) s = s.replace(/,/g, '')
  else s = s.replace(',', '.')
  const n = parseFloat(s)
  return !isNaN(n) && s.length > 0 && Math.abs(n) < 100_000_000
}

function buildConfidence(kwScore: number, valueMatch: boolean): FieldConfidence {
  const total = kwScore + (valueMatch ? 2 : 0)
  if (total >= 5) return { level: 'certain', pct: 95, reason: 'Riconosciuto con certezza' }
  if (total >= 3) return { level: 'probable', pct: 70, reason: 'Ipotizzato dal nome colonna' }
  if (total >= 1) return { level: 'uncertain', pct: 35, reason: 'Corrispondenza debole' }
  return { level: 'none', pct: 0, reason: 'Selezione manuale richiesta' }
}

const BANK_CERTAIN: FieldConfidence = { level: 'certain', pct: 98, reason: 'Riconosciuto automaticamente' }

function autoDetect(headers: string[], rows: CSVRow[], bankOverrides: Partial<Mapping> = {}) {
  const rank = (kws: [string, number][], valueFn?: (v: string) => boolean, exclude: string[] = []) =>
    headers.filter(h => !exclude.includes(h)).map(h => {
      const low = h.toLowerCase()
      let best = 0
      for (const [p, pts] of kws) {
        if (low === p) { best = Math.max(best, pts + 2); break }
        if (low.includes(p)) { best = Math.max(best, pts) }
      }
      const valMatch = valueFn ? rows.slice(0, 5).map(r => (r[h] ?? '').trim()).filter(Boolean).some(valueFn) : false
      return { h, conf: buildConfidence(best, valMatch) }
    }).sort((a, b) => b.conf.pct - a.conf.pct)

  const dateH = bankOverrides.date || (rank([['data', 3], ['date', 3], ['giorno', 2]], isDateLike)[0]?.h || '')
  const amtH = bankOverrides.amount || (rank([['importo', 4], ['amount', 4]], isAmountLike, [dateH])[0]?.h || '')
  const descH = bankOverrides.description || (rank([['causale', 4], ['descrizione', 4]], undefined, [dateH, amtH])[0]?.h || '')
  
  return {
    mapping: { date: dateH, amount: amtH, description: descH, counterpart: bankOverrides.counterpart || '', paymentMethod: '', bankCategory: bankOverrides.bankCategory || '' },
    confidence: { date: bankOverrides.date ? BANK_CERTAIN : rank([['data', 3]], isDateLike)[0]?.conf || {level:'none',pct:0,reason:''}, amount: bankOverrides.amount ? BANK_CERTAIN : rank([['importo', 4]], isAmountLike)[0]?.conf || {level:'none',pct:0,reason:''}, description: bankOverrides.description ? BANK_CERTAIN : rank([['descrizione', 4]])[0]?.conf || {level:'none',pct:0,reason:''}, counterpart: {level:'none',pct:0,reason:''}, paymentMethod: {level:'none',pct:0,reason:''}, bankCategory: {level:'none',pct:0,reason:''} }
  }
}

const ConfidenceBadge = memo(({ conf }: { conf: FieldConfidence }) => {
  const cfg = {
    certain:  { label: '✓ Certo',    cls: 'bg-[var(--income-dim)] text-[var(--income)]' },
    probable: { label: '⚠ Verifica', cls: 'bg-[var(--warning-dim)] text-[var(--warning)]' },
    uncertain:{ label: '⚠ Incerto',  cls: 'bg-[var(--expense-dim)] text-[var(--expense)]' },
    none:     { label: '✗ Manuale',  cls: 'bg-[var(--bg-elevated)] text-[var(--fg-subtle)]' },
  }[conf.level]
  return <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full', cfg.cls)}>{cfg.label}</span>
})
ConfidenceBadge.displayName = 'ConfidenceBadge'

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  const [step, setStep] = useState<1|2|3>(1)
  const [file, setFile] = useState<File|null>(null)
  const [dragging, setDragging] = useState(false)
  const [data, setData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [bankFormat, setBankFormat] = useState<BankFormat>('generic')
  const [mapping, setMapping] = useState<Mapping>({ date: '', amount: '', description: '', counterpart: '', paymentMethod: '', bankCategory: '' })
  const [confidence, setConfidence] = useState<Record<keyof Mapping, FieldConfidence>>({ date: {level:'none',pct:0,reason:''}, amount: {level:'none',pct:0,reason:''}, description: {level:'none',pct:0,reason:''}, counterpart: {level:'none',pct:0,reason:''}, paymentMethod: {level:'none',pct:0,reason:''}, bankCategory: {level:'none',pct:0,reason:''} })
  const [accounts, setAccounts] = useState<{id:string; name:string; type:string}[]>([])
  const [accountId, setAccountId] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<ImportBatchSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const router = useRouter()
  const { confirm, open, handleConfirm, handleCancel, message } = useConfirm()

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const h = await getImportHistory()
      setHistory(h)
    } catch { toast.error("Impossibile caricare lo storico") } finally { setHistoryLoading(false) }
  }

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (await confirm(`Eliminare l'import "${fileName}"? Le transazioni "In attesa" verranno rimosse.`)) {
      try {
        await deleteImportBatch(batchId)
        toast.success("Importazione eliminata")
        setHistory(prev => prev.filter(b => b.id !== batchId))
      } catch (e: any) { toast.error(e.message) }
    }
  }

  useEffect(() => {
    getAccountsForImport().then(list => { setAccounts(list); if (list.length > 0) setAccountId(list[0].id) })
    loadHistory()
  }, [])

  const handleMappingChange = useCallback((field: keyof Mapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const payload = data.map(row => ({
        date: row[mapping.date] || '',
        amount: row[mapping.amount] || '',
        description: row[mapping.description] || '',
        payee: mapping.counterpart ? row[mapping.counterpart] : undefined,
        paymentMethod: mapping.paymentMethod ? row[mapping.paymentMethod] : undefined,
        bankCategory: mapping.bankCategory ? row[mapping.bankCategory] : undefined,
      }))
      const res = await processImport(payload, { accountId, fileName: file?.name })
      setResult(res)
      toast.success("Importazione completata con successo")
      loadHistory()
    } catch (e: any) { toast.error(e.message) } finally { setIsImporting(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-400">
      <ConfirmDialog open={open} message={message} onConfirm={handleConfirm} onCancel={handleCancel} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-[var(--fg-primary)]">Importa CSV</h1>
          <p className="text-sm mt-1 text-[var(--fg-muted)]">Gestione importazioni e storico file</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl w-fit bg-[var(--bg-elevated)]">
        {[ { id: 'import', label: 'Nuovo Import', icon: Upload }, { id: 'history', label: 'Storico', icon: History } ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all", activeTab === id ? "shadow-sm bg-[var(--bg-surface)] text-[var(--fg-primary)]" : "text-[var(--fg-muted)]")}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-10 rounded-[2rem] border shadow-xl bg-[var(--bg-surface)] border-[var(--border-default)]">
        {activeTab === 'history' ? (
          <div className="space-y-4">
            {historyLoading ? <Loader2 className="animate-spin mx-auto text-[var(--accent)]" /> : history.map(batch => (
              <div key={batch.id} className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent-dim)] text-[var(--accent)]"><FileText size={18} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{batch.fileName}</p>
                    <p className="text-[10px] text-[var(--fg-subtle)] uppercase font-bold">{batch.accountName} · {batch.rowCount} righe</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteBatch(batch.id, batch.fileName)} className="p-2 text-[var(--expense)] hover:bg-[var(--expense-dim)] rounded-xl transition-all"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        ) : result ? (
          <div className="text-center py-6">
            <CheckCircle2 size={48} className="mx-auto text-[var(--income)] mb-4" />
            <h3 className="text-xl font-bold mb-2">Completato!</h3>
            <p className="text-sm text-[var(--fg-muted)] mb-6">Importate {result.importedCount} transazioni.</p>
            
            <div className="bg-[var(--accent-dim)]/10 border border-[var(--accent)]/20 p-4 rounded-2xl mb-6 text-left flex items-start gap-4">
              <div className="p-2 bg-[var(--accent-dim)] text-[var(--accent)] rounded-xl mt-0.5">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--fg-primary)] mb-1">Suggerimento AI</p>
                <p className="text-xs text-[var(--fg-muted)] mb-3">Hai appena importato nuovi movimenti. Vai alla pagina Transazioni per rilevare automaticamente eventuali trasferimenti tra i tuoi conti.</p>
                <button onClick={() => router.push('/app/transactions')} className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
                  Vai alle Transazioni <ArrowRight size={12} />
                </button>
              </div>
            </div>

            <button onClick={() => {setResult(null); setStep(1)}} className="px-6 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--fg-primary)] rounded-xl font-bold hover:bg-[var(--bg-surface)] transition-all">Nuovo Import</button>
          </div>
        ) : step === 1 ? (
          <div onClick={() => document.getElementById('csv-upload')?.click()} className="p-12 border-2 border-dashed border-[var(--border-default)] rounded-[2rem] text-center cursor-pointer hover:bg-[var(--bg-elevated)] transition-all">
            <Upload size={48} className="mx-auto text-[var(--fg-subtle)] mb-4" />
            <p className="font-bold">Clicca o trascina il file CSV qui</p>
            <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setFile(f); setStep(2); Papa.parse(f, { header:true, complete: (r) => { setData(r.data as any); setHeaders(Object.keys(r.data[0] || {})) }}) } }} />
          </div>
        ) : (
          <div className="space-y-6">
             <p className="text-sm font-bold uppercase tracking-widest text-[var(--fg-subtle)]">Configura Mappatura</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['date', 'amount', 'description'].map(f => (
                  <div key={f} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase">{f}</label>
                    <select value={(mapping as any)[f]} onChange={e => handleMappingChange(f as any, e.target.value)} className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl">
                      <option value="">Seleziona...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
             </div>
             <button onClick={handleImport} disabled={isImporting} className="w-full py-4 bg-[var(--accent)] text-white rounded-xl font-bold uppercase tracking-widest shadow-lg">
               {isImporting ? <Loader2 className="animate-spin mx-auto" /> : "Avvia Importazione"}
             </button>
          </div>
        )}
      </div>
    </div>
  )
}
