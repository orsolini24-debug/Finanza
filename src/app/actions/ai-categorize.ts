'use server'
import Groq from 'groq-sdk'
import prisma from "@/lib/prisma"
import { getWorkspaceForUser } from "@/lib/auth-utils"

export async function aiSuggestCategories(transactionIds: string[]) {
  const { workspace } = await getWorkspaceForUser()

  const [txs, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { id: { in: transactionIds }, workspaceId: workspace.id },
      select: { id: true, description: true, amount: true }
    }),
    prisma.category.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, type: true }
    })
  ])

  // Separate categories by type to help AI match correctly
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')
  const incomeCategories  = categories.filter(c => c.type === 'INCOME'  || c.type === 'BOTH')

  const catList = categories
    .map(c => `  { "id": "${c.id}", "name": "${c.name}", "tipo": "${c.type === 'EXPENSE' ? 'uscita' : c.type === 'INCOME' ? 'entrata' : 'entrambi'}" }`)
    .join('\n')

  const txList = txs.map(tx => {
    const sign = Number(tx.amount) < 0 ? 'USCITA' : 'ENTRATA'
    // Normalize: trim extra spaces, truncate at 80 chars
    const desc = tx.description.replace(/\s+/g, ' ').trim().slice(0, 80)
    return `  { "id": "${tx.id}", "desc": "${desc}", "tipo": "${sign}", "importo": ${Math.abs(Number(tx.amount)).toFixed(2)} }`
  }).join('\n')

  const prompt = `Sei un assistente di finanza personale italiano specializzato nella categorizzazione automatica dei movimenti bancari.

## Categorie disponibili
${catList}

## Movimenti da categorizzare
${txList}

## Istruzioni
1. Per ogni movimento, assegna la categoria più appropriata dall'elenco sopra.
2. Usa il campo "tipo" del movimento come guida principale: movimenti USCITA → preferisci categorie "uscita"; movimenti ENTRATA → preferisci categorie "entrata".
3. Analizza la descrizione per identificare il tipo di spesa/entrata:
   - Supermercati (esselunga, coop, lidl, carrefour, aldi, penny ecc.) → alimentari/spesa
   - Carburanti (q8, eni, shell, agip, ip, tamoil) → auto/carburante
   - Farmacia/farmaci/parafarmacia → salute
   - Abbonamenti streaming (netflix, spotify, amazon prime, disney) → intrattenimento/abbonamenti
   - Ristoranti, bar, caffè, pizzeria, trattoria → ristorante/cibo fuori
   - Affitto, condominio, mutuo → abitazione
   - Bollette (luce, gas, acqua, enel, a2a, italgas) → utenze
   - Stipendio, accredito, bonifico entrata → reddito/stipendio
   - Assicurazione, rcauto → assicurazioni
   - Amazon, zalando, shein ecc. → shopping/acquisti online
4. Se la descrizione è generica o non corrisponde a nessuna categoria, usa null con confidence bassa.
5. Non inventare categorie che non esistono nell'elenco.

Rispondi SOLO con un JSON array, senza testo aggiuntivo:
[
  { "transactionId": "...", "categoryId": "..." o null, "confidence": 0.0-1.0 },
  ...
]
Confidence: 0.9+ = sicuro, 0.7-0.89 = probabile, 0.5-0.69 = incerto, <0.5 = usa null.`

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  try {
    const res = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.05,
      max_tokens: 4000,
    })

    const text = res.choices[0].message.content ?? '[]'
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []

    const raw = JSON.parse(match[0]) as { transactionId: string; categoryId: string | null; confidence: number }[]
    const validIds = new Set(categories.map(c => c.id))

    return raw.map(s => ({
      transactionId: s.transactionId,
      categoryId:    s.categoryId && validIds.has(s.categoryId) ? s.categoryId : null,
      categoryName:  s.categoryId ? categories.find(c => c.id === s.categoryId)?.name ?? null : null,
      confidence:    Math.max(0, Math.min(1, s.confidence ?? 0)),
    }))
  } catch (error) {
    console.error('[aiSuggestCategories] Error calling Groq:', error)
    throw new Error('Errore durante la categorizzazione AI')
  }
}
