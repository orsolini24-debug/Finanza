import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { getPeriodRange } from "@/lib/period"
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workspaceId, month } = await req.json()
    const { start, end } = getPeriodRange(month)

    // Dati mese corrente
    const currentTxs = await prisma.transaction.findMany({
      where: { workspaceId, status: 'CONFIRMED', date: { gte: start, lte: end } },
      include: { category: true }
    })

    // Dati mese precedente
    const prevDate = new Date(start)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const { start: pStart, end: pEnd } = getPeriodRange(prevMonthStr)
    const prevTxs = await prisma.transaction.findMany({
      where: { workspaceId, status: 'CONFIRMED', date: { gte: pStart, lte: pEnd } }
    })

    // Aggregazione dati per il prompt
    const income = currentTxs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const expenses = Math.abs(currentTxs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0))
    const prevIncome = prevTxs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const prevExpenses = Math.abs(prevTxs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0))

    const catMap: Record<string, number> = {}
    currentTxs.filter(t => Number(t.amount) < 0).forEach(t => {
      const name = t.category?.name || 'Altro'
      catMap[name] = (catMap[name] || 0) + Math.abs(Number(t.amount))
    })
    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, a]) => `${n} (€${a})`).join(', ')

    // Prompt
    const prompt = `Sei un assistente finanziario personale. Analizza questi dati finanziari e restituisci esattamente 4 insight brevi (max 2 righe ognuno) in italiano.
      Formato risposta: JSON object con chiave "insights" che contiene un array di oggetti { type: 'positive'|'warning'|'tip'|'info', icon: emoji, title: string, message: string }.

      Dati mese corrente:
      - Entrate: €${income} | Uscite: €${expenses} | Risparmio: €${income - expenses}
      - Mese precedente: Entrate €${prevIncome} | Uscite €${prevExpenses}
      - Top categorie spesa: ${categories}

      Sii diretto, pratico, in italiano. Non usare linguaggio generico.`

    if (!process.env.GROQ_API_KEY) {
      // Fallback se la chiave non è configurata
      return NextResponse.json({ 
        insights: [
          { type: 'info', icon: '💡', title: 'Configurazione AI', message: 'Configura GROQ_API_KEY per attivare gli insight intelligenti.' },
          { type: 'positive', icon: '💰', title: 'Analisi Pronta', message: 'Il sistema è pronto per analizzare i tuoi flussi di cassa.' }
        ] 
      })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'max-age=3600' }
    })

  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
