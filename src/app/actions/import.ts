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

  // Italiano/Europeo: 11/03/2026  11-03-2026  11.03.2026  11/03/26
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
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

  // Rimuovi simboli valuta e spazi
  s = s.replace(/[€$£\s]/g, '')

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
    // Solo virgola senza punto: potrebbe essere separatore decimale
    s = s.replace(',', '.')
  }

  const n = parseFloat(s)
  if (isNaN(n)) throw new Error(`Importo non riconosciuto: "${raw}"`)
  return n
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

// ── Action: import CSV ──────────────────────────────────────────
export async function processImport(data: {
  date: string
  amount: string
  description: string
  payee?: string
  paymentMethod?: string
}[], options: {
  accountId: string
  paymentMethod?: string
  fileName?: string
}) {
  const { workspace } = await getWorkspaceForUser()

  // Verifica che il conto appartenga al workspace
  const account = await prisma.account.findFirst({
    where: { id: options.accountId, workspaceId: workspace.id },
  })
  if (!account) throw new Error("Conto non trovato o non autorizzato.")

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

  const defaultPm = (options.paymentMethod ?? null) as PaymentMethod | null

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      const date        = parseDate(row.date)
      const amount      = parseAmount(row.amount)
      const description = (row.description ?? '').trim()

      if (!description) { errors.push(`Riga ${i + 2}: descrizione vuota`); continue }

      // Dedup: stessa data + importo + descrizione + conto
      const existing = await prisma.transaction.findFirst({
        where: { workspaceId: workspace.id, accountId: account.id, date, amount, description }
      })
      if (existing) { duplicateCount++; continue }

      const tx = await prisma.transaction.create({
        data: {
          workspaceId:   workspace.id,
          accountId:     account.id,
          date,
          amount,
          description,
          status:        'STAGED',
          paymentMethod: defaultPm,
        }
      })

      await prisma.importRow.create({
        data: {
          batchId:      batch.id,
          workspaceId:  workspace.id,
          rawJson:      row as any,
          parsedDate:   date,
          parsedAmount: amount,
          parsedDesc:   description,
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

  return { success: true, importedCount, duplicateCount, errors }
}
