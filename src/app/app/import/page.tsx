'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { processImport } from '@/app/actions/import'

type CSVRow = Record<string, string>

type Mapping = {
  date: string
  amount: string
  description: string
  payee?: string
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
      setFile(uploadedFile)
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data as CSVRow[])
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
      console.error("Import failed", e)
      alert("Import failed. Make sure you are logged in and try again.")
    } finally {
      setIsImporting(false)
    }
  }

  const renderStep1 = () => (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
      <Upload className="w-12 h-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Upload your bank statement</h3>
      <p className="text-sm text-gray-500 mb-6">Drag and drop or click to browse CSV files</p>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
        id="csv-upload"
      />
      <label
        htmlFor="csv-upload"
        className="bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition"
      >
        Select File
      </label>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Map your CSV columns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['date', 'amount', 'description', 'payee'] as const).map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-sm font-medium capitalize">{field}*</label>
            <select
              className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              value={mapping[field] || ''}
              onChange={(e) => handleMappingChange(field, e.target.value)}
            >
              <option value="">Select column...</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 mt-8">
        <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Back</button>
        <button
          disabled={!isMappingValid}
          onClick={handleConfirmMapping}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          Next: Preview
        </button>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const previewRows = data.slice(0, 10)
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold">Preview your data</h3>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 border-b">Date</th>
                <th className="px-4 py-2 border-b">Amount</th>
                <th className="px-4 py-2 border-b">Description</th>
                <th className="px-4 py-2 border-b">Payee</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                  <td className="px-4 py-2 border-b">{row[mapping.date]}</td>
                  <td className="px-4 py-2 border-b font-mono">{row[mapping.amount]}</td>
                  <td className="px-4 py-2 border-b text-sm max-w-xs truncate">{row[mapping.description]}</td>
                  <td className="px-4 py-2 border-b">{mapping.payee ? row[mapping.payee] : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" disabled={isImporting}>Back</button>
          <button 
            onClick={handleImport}
            disabled={isImporting}
            className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? `Importing...` : `Import ${data.length} Transactions`}
          </button>
        </div>
      </div>
    )
  }
  
  const renderResult = () => (
    <div className="text-center p-12">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Import Successful</h2>
        <p className="text-gray-600 dark:text-gray-400">
            {importResult?.importedCount} transactions were imported.
        </p>
        <p className="text-gray-500 text-sm">
            {importResult?.duplicateCount} duplicates were skipped.
        </p>
        <button onClick={() => window.location.reload()} className="mt-8 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Import Another File
        </button>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
        <div className="h-px w-8 bg-gray-200" />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
        <div className="h-px w-8 bg-gray-200" />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
        <h1 className="text-2xl font-bold ml-4">CSV Import Wizard</h1>
      </div>

      <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border shadow-sm">
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
