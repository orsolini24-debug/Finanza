'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getWorkspaceForUser } from "@/lib/auth-utils";
import { PaymentMethod } from "@prisma/client";

// ── Parsing robusto data ────────────────────────────────────────
function parseDate(raw: string): Date {
  const s = raw.trim()

  // ISO: 2026-03-11 oppure 2026-03-11T...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s)

  // Italiano/Europeo: 11/03/2026  11-03-2026  11.03.2026  11/03/26  oppure 11/3/2026 (senza zero)
  const m = s.match(/^(\d{1,2})[\\/\-\.](\d{1,2})[\\/\-\.](\d{2,4})/)
  if (m) {
    const day   = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year  = m[3].length === 2 ? '20' + m[3] : m[3]
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`)
  }

  // Fallback
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  throw new Error(`Data non riconosciuta: "${raw}"`)
}

// ── Parsing robusto importo ─────────────────────────────────────
function parseAmount(raw: string): number {
  let s = raw.toString().trim()

  // Rimuovi simboli valuta, codici valuta (EUR/USD ecc.) e spazi
  s = s.replace(/[€$£\s]/g, '')
  s = s.replace(/\b(EUR|USD|GBP|CHF|JPY|SEK|NOK|DKK|PLN|CZK|HUF|RON|AUD|CAD)\b/gi, '').trim()

  // Trailing minus: "45,50-" → "-45.50"
  if (s.endsWith('-')) s = '-' + s.slice(0, -1)

  // Determina formato: europeo (virgola decimale) vs US (punto decimale)
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')

  if (lastComma > lastDot) {
    // Europeo: 1.234,56 → rimuovi punti migliaia, sostituisci virgola
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    // US/ISO: 1,234.56 → rimuovi virgole migliaia
    s = s.replace(/,/g, '')
  } else {
    // Solo virgola senza punto: separatore decimale
    s = s.replace(',', '.')
  }

  const n = parseFloat(s)
  if (isNaN(n)) throw new Error(`Importo non riconosciuto: "${raw}"`)
  return n
}

// ── Converte stringa raw in PaymentMethod enum (o null) ─────────
const VALID_PM = new Set<string>([
  'CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER',
  'PAYPAL', 'CRYPTO', 'DIRECT_DEBIT', 'CHECK', 'OTHER',
])
function toPaymentMethod(raw?: string): PaymentMethod | null {
  if (!raw) return null
  const upper = raw.trim().toUpperCase().replace(/[\s\-]+/g, '_')
  return VALID_PM.has(upper) ? (upper as PaymentMethod) : null
}

// ── Auto-rilevamento metodo di pagamento dal testo ──────────────
// Funziona su descrizione e payee per banche che non hanno colonna dedicata (es. Sella, BPM)
function autoDetectPaymentMethod(desc: string, payee?: string): PaymentMethod | null {
  const text = ((desc ?? '') + ' ' + (payee ?? '')).toUpperCase()
  if (/PAGAMENTO CON CARTA|CARTA DI (DEBITO|CREDITO)|POS /.test(text)) return 'DEBIT_CARD'
  if (/BONIFICO (ESEGUITO|RICEVUTO|ISTANTANEO|DISPOSTO|ORDINATO)/.test(text)) return 'BANK_TRANSFER'
  if (/PAYPAL/.test(text)) return 'PAYPAL'
  if (/ADDEBITO DIRETTO|SEPA|MANDATO|RID\b/.test(text)) return 'DIRECT_DEBIT'
  if (/CONTANTI|SPORT\. AUT\.|BANCOMAT PAY|ATM\b/.test(text)) return 'CASH'
  if (/CARTA DI CREDITO|CREDIT CARD/.test(text)) return 'CREDIT_CARD'
  return null
}

// ── Etichette generiche bancarie: se usate come descrizione → scambia con payee ──
// (es. Bank 1 stile Sella: Causale="BONIFICO ESEGUITO", Movimento="AFFITTO APRILE")
const GENERIC_BANKING_LABELS = new Set([
  'BONIFICO ESEGUITO', 'BONIFICO RICEVUTO', 'BONIFICO ISTANTANEO', 'BONIFICO ORDINATO',
  'ACCREDITO DELLO STIPENDIO', 'ACCREDITO STIPENDIO',
  'PAGAMENTO CON CARTA',
  'LIQUIDAZIONE INTERESSI-COMMISSIONI-SPESE', 'LIQUIDAZIONE INTERESSI',
  'RIT. CONTANTI A DEBITO CON CARTA PRESSO SPORT. AUT.',
  'COMM. RIT. CONT. A DEBITO CON CARTA IN SPORT. AUT.',
  'ADDEBITO DIRETTO', 'STORNO PAGAMENTO POS', 'PRELIEVO ATM',
])

// ── Mapping categorie banca → termini per cercare nelle nostre categorie ──
// Ogni voce: pattern che matcha la categoria della banca → termini da cercare nei nomi delle nostre categorie
const BANK_CAT_MAP: Array<{ pattern: RegExp; terms: string[] }> = [
  { pattern: /aliment|supermercato|spesa/i,          terms: ['alimentar', 'spesa', 'supermercato', 'cibo', 'food', 'grocery'] },
  { pattern: /ristorant|bar |pizzer|ristora/i,        terms: ['ristorant', 'bar', 'ristora', 'pizza', 'mangiare'] },
  { pattern: /carburant|benzina|gasolio/i,            terms: ['carburant', 'benzina', 'auto', 'veicolo', 'fuel'] },
  { pattern: /trasport/i,                             terms: ['trasport', 'mobilità', 'bus', 'metro', 'treno'] },
  { pattern: /pedagg|telepass/i,                     terms: ['telepass', 'pedagg', 'autostrad', 'casello'] },
  { pattern: /viagg|vacanz/i,                         terms: ['viagg', 'vacanz', 'hotel', 'travel'] },
  { pattern: /cellulare|telefon/i,                   terms: ['telefon', 'cellulare', 'mobile', 'sim'] },
  { pattern: /internet|tv,|streaming/i,              terms: ['internet', 'streaming', 'abbonament', 'tv', 'netflix'] },
  { pattern: /abbigliament|vestiar/i,                terms: ['abbigliament', 'vestit', 'moda', 'clothing'] },
  { pattern: /casa vari/i,                            terms: ['casa', 'abitazion', 'arredam'] },
  { pattern: /affitto|canone/i,                       terms: ['affitto', 'canone', 'casa', 'abitazion'] },
  { pattern: /spettacol|muse|cinema|teatro/i,        terms: ['svago', 'cultura', 'spettacol', 'cinema', 'teatro'] },
  { pattern: /tempo libero|sport|hobby/i,            terms: ['svago', 'sport', 'hobby', 'intratteniment'] },
  { pattern: /impost|tass|tribut/i,                  terms: ['tass', 'impost', 'tribut', 'fiscal', 'imu', 'irpef'] },
  { pattern: /mutuo|finanziament|prestit|rata /i,    terms: ['mutuo', 'finanziament', 'rata', 'prestit'] },
  { pattern: /stipendio|salario|accredito.*stipend/i,terms: ['stipendio', 'salario', 'reddit', 'lavoro', 'salary'] },
  { pattern: /farmacia|medic|salute|sanitar/i,       terms: ['salut', 'farmacia', 'medic', 'sanit', 'health'] },
  { pattern: /istruz|universit|scolast/i,            terms: ['istruzion', 'universit', 'scuola', 'corso'] },
  { pattern: /entrate varie|bonifici ricevuti/i,      terms: ['entrate', 'reddito', 'income'] },
]

function matchBankCategory(
  bankCat: string,
  wsCategories: { id: string; name: string }[],
): string | undefined {
  for (const rule of BANK_CAT_MAP) {
    if (!rule.pattern.test(bankCat)) continue
    for (const cat of wsCategories) {
      const nameLow = cat.name.toLowerCase()
      if (rule.terms.some(t => nameLow.includes(t))) return cat.id
    }
  }
  return undefined
}

// ── Action: prende i conti del workspace ────────────────────────
export async function getAccountsForImport() {
  const { workspace } = await getWorkspaceForUser()
  const accounts = await prisma.account.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  })
  return accounts
}

// ── Action: storico import ──────────────────────────────────────
export async function getImportHistory() {
  const { workspace } = await getWorkspaceForUser()
  const batches = await prisma.importBatch.findMany({
    where: { workspaceId: workspace.id },
    include: {
      account: { select: { name: true } },
      _count:  { select: { rows: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return batches.map(b => ({
    id:          b.id,
    fileName:    b.fileName,
    sourceType:  b.sourceType,
    accountName: b.account.name,
    rowCount:    b._count.rows,
    createdAt:   b.createdAt.toISOString(),
  }))
}

// ── Action: elimina batch import (+ transazioni associate STAGED) ─
export async function deleteImportBatch(batchId: string) {
  const { workspace } = await getWorkspaceForUser()

  // Verifica ownership
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, workspaceId: workspace.id },
    include: { rows: { select: { transactionId: true } } },
  })
  if (!batch) throw new Error('Import non trovato o non autorizzato.')

  const txIds = batch.rows
    .map(r => r.transactionId)
    .filter((id): id is string => id !== null)

  // Elimina tag e split delle transazioni (no cascaded transactions)
  if (txIds.length > 0) {
    await prisma.transactionTag.deleteMany({ where: { transactionId: { in: txIds } } })
    await prisma.transactionSplit.deleteMany({ where: { transactionId: { in: txIds } } })
    // Elimina solo le transazioni ancora STAGED (quelle confermate restano)
    await prisma.transaction.deleteMany({
      where: { id: { in: txIds }, status: 'STAGED', workspaceId: workspace.id },
    })
  }

  // Le ImportRow vengono eliminate in cascade dal batch
  await prisma.importBatch.delete({ where: { id: batchId } })

  revalidatePath('/app/import')
  revalidatePath('/app/transactions')
  revalidatePath('/app/dashboard')
  return { success: true }
}

// ── Action: import CSV ──────────────────────────────────────────
export async function processImport(data: {
  date:          string
  amount:        string
  description:   string
  payee?:        string
  paymentMethod?: string
  bankCategory?: string   // categoria della banca (es. "Generi alimentari e supermercato")
}[], options: {
  accountId:      string
  paymentMethod?: string   // fallback globale (opzionale)
  fileName?:      string
}) {
  const { workspace } = await getWorkspaceForUser()

  const account = await prisma.account.findFirst({
    where: { id: options.accountId, workspaceId: workspace.id },
  })
  if (!account) throw new Error("Conto non trovato o non autorizzato.")

  // Fetch categorie workspace se almeno una riga ha bankCategory
  const hasBankCategories = data.some(r => r.bankCategory?.trim())
  let wsCategories: { id: string; name: string }[] = []
  if (hasBankCategories) {
    wsCategories = await prisma.category.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true },
    })
  }

  const batch = await prisma.importBatch.create({
    data: {
      workspaceId: workspace.id,
      accountId:   account.id,
      sourceType:  'csv',
      fileName:    options.fileName ?? 'import.csv',
    }
  })

  let importedCount  = 0
  let duplicateCount = 0
  const errors: string[] = []

  const defaultPm = toPaymentMethod(options.paymentMethod)

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      const date = parseDate(row.date)

      // ── Pulizia descrizione ────────────────────────────────────
      // Normalizza spazi multipli (es. "LIDL 1461      MILANO     IT" → "LIDL 1461 MILANO IT")
      // Rimuove IBAN dal payee ("MATTEO BATTAGLI IT31E..." → "MATTEO BATTAGLI")
      let rawDesc = (row.description ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
      let rawPayee = (row.payee ?? '').replace(/[\r\n]+/g, ' ').trim()
      // Strip IBAN dalla controparte (IT seguita da 25+ alfanumerici)
      rawPayee = rawPayee.replace(/\s*IT\d{2}[A-Z0-9]{10,}/gi, '').trim()
      // Strip altri codici identificativi lunghi
      rawPayee = rawPayee.replace(/\s*[A-Z]{2}\d{2}[A-Z0-9]{10,}/gi, '').trim()

      // ── Smart description swap (formati bancari tipo Sella) ────
      // Se la "descrizione" è un'etichetta generica (es. "BONIFICO ESEGUITO")
      // e il payee ha contenuto reale (es. "AFFITTO APRILE"), usa il payee come descrizione
      const isGenericLabel = GENERIC_BANKING_LABELS.has(rawDesc.toUpperCase())
      const hasRealPayee = rawPayee && rawPayee !== '-' && rawPayee !== '--' && rawPayee.length > 2
      if (isGenericLabel && hasRealPayee) {
        rawDesc = rawPayee
      }

      const description = rawDesc
      if (!description) { errors.push(`Riga ${i + 2}: descrizione vuota`); continue }

      const amount = parseAmount(row.amount)

      // Dedup: stessa data + importo + descrizione + conto
      const existing = await prisma.transaction.findFirst({
        where: { workspaceId: workspace.id, accountId: account.id, date, amount, description }
      })
      if (existing) { duplicateCount++; continue }

      // ── Metodo di pagamento ────────────────────────────────────
      // Priorità: colonna CSV per riga > auto-rilevato dal testo > fallback globale
      const rowPm = toPaymentMethod(row.paymentMethod)
        ?? autoDetectPaymentMethod(rawDesc, rawPayee)
        ?? defaultPm

      // ── Categoria da categoria banca ──────────────────────────
      let autoCategoryId: string | null = null
      if (row.bankCategory?.trim() && wsCategories.length > 0) {
        autoCategoryId = matchBankCategory(row.bankCategory, wsCategories) ?? null
      }

      // ── Auto-marcatura trasferimenti ──────────────────────────
      // Se la descrizione originale (o il payee) contiene "Trasferimento" e
      // il beneficiario sembra lo stesso utente → marcato come potenziale trasferimento
      const isLikelyTransfer = /trasferimento/i.test(rawDesc) || /trasferimento/i.test(rawPayee)

      const tx = await prisma.transaction.create({
        data: {
          workspaceId:   workspace.id,
          accountId:     account.id,
          date,
          amount,
          description,
          status:        'STAGED',
          paymentMethod: rowPm,
          categoryId:    autoCategoryId,
          isTransfer:    isLikelyTransfer,
        }
      })

      await prisma.importRow.create({
        data: {
          batchId:       batch.id,
          workspaceId:   workspace.id,
          rawJson:       row as any,
          parsedDate:    date,
          parsedAmount:  amount,
          parsedDesc:    description,
          transactionId: tx.id,
        }
      })

      importedCount++
    } catch (err: any) {
      errors.push(`Riga ${i + 2}: ${err.message}`)
    }
  }

  revalidatePath('/app/dashboard')
  revalidatePath('/app/transactions')
  revalidatePath('/app/accounts')
  revalidatePath('/app/import')

  return { success: true, importedCount, duplicateCount, errors, batchId: batch.id }
}
