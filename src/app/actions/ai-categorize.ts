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

  const catList = categories.map(c => `"${c.id}": "${c.name}" (${c.type})`).join(', ')
  const txList  = txs.map(tx => `{ "id": "${tx.id}", "desc": "${tx.description}", "amount": ${tx.amount} }`).join('\n')

  const prompt = `Sei un assistente di finanza personale italiano. Assegna la categoria più appropriata a ogni movimento.

Categorie disponibili (id: nome):
${catList}

Movimenti:
${txList}

Rispondi SOLO con un JSON array. Ogni elemento: { "transactionId": "...", "categoryId": "..." o null, "confidence": 0.0-1.0 }
Usa null se non sei sicuro (confidence < 0.5).`

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  try {
    const res = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
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
