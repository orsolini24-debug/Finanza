'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Upload, ChevronRight, CheckCircle2, AlertCircle, FileText, Database, ShieldCheck, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'      
import { processImport } from '@/app/actions/import'
import { cn } from '@/lib/utils'

type CSVRow = Record<string, string>

type Mapping = {
  date: string
  amount: string
  description: string
  payee?: string
}

const FIELD_LABELS: Record<keyof Mapping, string> = {
  date: 'Data',
  amount: 'Importo',
  description: 'Descrizione',
  payee: 'Beneficiario'
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Mapping>({ date: '', amount: '', description: '' })
  const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Preview
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{success?: boolean, importedCount?: number, duplicateCount?: number} | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (uploadedFile) {
      if (uploadedFile.size > 5 * 1024 * 1024) {
        alert('File troppo grande. Dimensione massima: 5 MB.')
        e.target.value = ''
        return
      }
      setFile(uploadedFile)
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as CSVRow[]
          if (rows.length === 0) {
            alert('Il file CSV non contiene righe di dati. Controlla il file e riprova.')
            e.target.value = ''
            return
          }
          setData(rows)
          setHeaders(results.meta.fields || [])
          setStep(2)
        },
      })
    }
  }

  const handleMappingChange = (field: keyof Mapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }))
  }

  const isMappingValid = mapping.date && mapping.amount && mapping.description      

  const handleConfirmMapping = () => {
    if (isMappingValid) setStep(3)
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const payload = data.map(row => ({
        date: row[mapping.date],
        amount: row[mapping.amount],
        description: row[mapping.description],
        payee: mapping.payee ? row[mapping.payee] : undefined
      }))
      const result = await processImport(payload)
      setImportResult(result)
    } catch (e) {
      alert("Importazione fallita. Assicurati di aver effettuato l'accesso e riprova.")
    } finally {
      setIsImporting(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setData([])
    setHeaders([])
    setMapping({ date: '', amount: '', description: '' })
    setStep(1)
    setImportResult(null)
  }

  const renderStep1 = () => (
    <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-[var(--accent)] bg-[var(--accent-dim)] rounded-[3rem] transition-all duration-300 hover:bg-[var(--accent)]/10 group cursor-pointer relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-6 bg-[var(--bg-surface)] rounded-3xl shadow-xl group-hover:scale-110 transition-transform duration-500 mb-6 z-10">
        <Upload className="w-10 h-10 text-[var(--accent)]" />
      </div>
      <h3 className="text-2xl font-display font-bold text-[var(--fg-primary)] mb-2 z-10">Seleziona l'Estratto Conto</h3>    
      <p className="text-[var(--fg-muted)] mb-8 font-medium z-10">Trascina il tuo file CSV qui o clicca per sfogliare</p>
      
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
        id="csv-upload"
      />
      <label
        htmlFor="csv-upload"
        className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-on)] font-bold rounded-2xl cursor-pointer hover:shadow-[0_0_20px_var(--glow-accent)] transition-all z-10 active:scale-95"
      >
        Scegli File
      </label>
      
      <div className="mt-8 flex flex-col items-center gap-4 z-10">
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">
            <ShieldCheck size={14} className="text-[var(--income)]" />
            SSL Sicuro
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">
            <FileText size={14} />
            Formato CSV
          </div>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] font-medium text-center max-w-sm">
          Il CSV deve avere colonne: <span className="font-bold text-[var(--fg-primary)]">data, importo, descrizione</span> (i nomi esatti non importano, li mapperai nel prossimo step).
        </p>
        <a
          href="data:text/csv;charset=utf-8,Data,Importo,Descrizione,Beneficiario%0A2026-03-01,-45.50,Supermercato Conad,Conad%0A2026-03-03,1800.00,Stipendio Marzo,Azienda SRL"
          download="template-import.csv"
          className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText size={12} />
          Scarica template CSV di esempio
        </a>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 p-6 bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-2xl">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Database className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--fg-primary)]">Analisi Struttura Dati</h3>
          <p className="text-xs text-[var(--fg-muted)] font-medium">Mappa le colonne del tuo CSV ai campi del nostro database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['date', 'amount', 'description', 'payee'] as const).map((field) => (     
          <div key={field} className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
              {FIELD_LABELS[field]}{field !== 'payee' ? '*' : ' (opzionale)'}
            </label>      
            <div className="relative">
              <select
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] font-medium appearance-none cursor-pointer"  
                value={mapping[field] || ''}
                onChange={(e) => handleMappingChange(field, e.target.value)}
              >
                <option value="">Seleziona colonna...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] rotate-90 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-8">
        <button 
          onClick={() => setStep(1)} 
          className="flex items-center gap-2 px-6 py-3 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all"
        >
          <ArrowLeft size={16} />
          Indietro
        </button>
        <button
          disabled={!isMappingValid}
          onClick={handleConfirmMapping}
          className="flex items-center gap-2 px-8 py-3 bg-[var(--accent)] text-[var(--accent-on)] font-bold rounded-2xl disabled:opacity-50 hover:shadow-[0_0_20px_var(--glow-accent)] transition-all active:scale-95"  
        >
          Anteprima Dati
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const previewRows = data.slice(0, 10)
    return (
      <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center gap-4 p-6 bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-2xl">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--fg-primary)]">Verifica Finale</h3>
            <p className="text-xs text-[var(--fg-muted)] font-medium">Controlla le prime 10 righe prima dell'importazione definitiva.</p>
          </div>
        </div>

        <div className="glass rounded-3xl overflow-hidden border border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest">Importo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest">Descrizione</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest">Beneficiario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[var(--fg-muted)]">{row[mapping.date]}</td>       
                    <td className="px-6 py-4 text-base font-mono font-bold tracking-tighter text-[var(--fg-primary)]">
                      {Number(row[mapping.amount]) >= 0 ? '+' : ''}{row[mapping.amount]}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[var(--fg-primary)] max-w-xs truncate">{row[mapping.description]}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--fg-subtle)]">{mapping.payee ? row[mapping.payee] : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center pt-8">
          <button 
            onClick={() => setStep(2)} 
            className="flex items-center gap-2 px-6 py-3 text-[var(--fg-muted)] font-bold text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-2xl transition-all" 
            disabled={isImporting}
          >
            <ArrowLeft size={16} />
            Indietro
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-10 py-4 bg-[var(--accent)] text-[var(--accent-on)] font-extrabold text-sm rounded-2xl hover:shadow-[0_0_30px_var(--glow-accent)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                Conferma Importazione {data.length} Transazioni
                <CheckCircle2 size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  const renderResult = () => (
    <div className="text-center p-16 animate-in zoom-in-95 duration-700">
        <div className="w-24 h-24 bg-[var(--income-dim)] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,217,160,0.2)]">
            <CheckCircle2 className="w-12 h-12 text-[var(--income)]" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[var(--fg-primary)] mb-4 tracking-tight">Importazione Riuscita</h2>
        <div className="max-w-xs mx-auto space-y-2 mb-10">
          <div className="flex justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--fg-muted)] uppercase">Importate</span>
            <span className="font-mono font-bold text-[var(--income)]">{importResult?.importedCount}</span>
          </div>
          <div className="flex justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--fg-muted)] uppercase">Duplicati Saltati</span>
            <span className="font-mono font-bold text-[var(--warning)]">{importResult?.duplicateCount}</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={resetImport} 
            className="px-8 py-3 bg-[var(--bg-elevated)] text-[var(--fg-primary)] font-bold rounded-2xl hover:bg-[var(--bg-elevated)]/80 transition-all border border-[var(--border-subtle)]"
          >
            Importa un altro
          </button>
          <a 
            href="/app/dashboard" 
            className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-on)] font-bold rounded-2xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all flex items-center justify-center gap-2"
          >
            Vai alla Dashboard
            <ArrowRight size={18} />
          </a>
        </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[var(--fg-primary)] tracking-tight">Wizard CSV</h1>
          <p className="text-[var(--fg-muted)] mt-2 font-medium">Trasforma i tuoi estratti conto in dati strutturati.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-2xl font-bold transition-all duration-500",
                step === s 
                  ? "bg-[var(--accent)] text-[var(--accent-on)] shadow-[0_0_15px_var(--glow-accent)] scale-110" 
                  : step > s 
                    ? "bg-[var(--income-dim)] text-[var(--income)]" 
                    : "bg-[var(--bg-elevated)] text-[var(--fg-subtle)]"
              )}>
                {step > s ? <CheckCircle2 size={18} /> : s}
              </div>
              {s < 3 && <div className={cn("h-0.5 w-6 mx-2 rounded-full", step > s ? "bg-[var(--income)]" : "bg-[var(--border-subtle)]")} />}
            </div>
          ))}
        </div>
      </div>

      <div className="glass bg-[var(--bg-surface)]/50 p-10 rounded-[3rem] border border-[var(--border-default)] shadow-2xl min-h-[400px] flex flex-col justify-center">   
        {importResult?.success ? renderResult() : (
            <>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </>
        )}
      </div>
    </div>
  )
}
