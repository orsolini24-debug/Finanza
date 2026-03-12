export const dynamic = 'force-dynamic'

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

    // 1. DATA ACQUISITION
    const [currentTxs, accounts, goals] = await Promise.all([
      prisma.transaction.findMany({
        where: { workspaceId, status: 'CONFIRMED', date: { gte: start, lte: end } },
        include: { category: true }
      }),
      prisma.account.findMany({ where: { workspaceId } }),
      prisma.goal.findMany({ where: { workspaceId } })
    ])

    // Data for previous month (Trend analysis)
    const prevDate = new Date(start)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const { start: pStart, end: pEnd } = getPeriodRange(prevMonthStr)
    const prevTxs = await prisma.transaction.findMany({
      where: { workspaceId, status: 'CONFIRMED', date: { gte: pStart, lte: pEnd } }
    })

    // 2. QUANTITATIVE CALCULATIONS (The "Minister" Logic)
    
    // Liquid Balance (Fondo Emergenza)
    const accountsWithBalance = await Promise.all(accounts.map(async (acc) => {
      const aggregate = await prisma.transaction.aggregate({
        where: { accountId: acc.id, status: { in: ['CONFIRMED', 'STAGED'] } },
        _sum: { amount: true }
      });
      const balance = Number(acc.openingBal) + Number(aggregate._sum.amount || 0);
      return { ...acc, balance };
    }));

    const liquidBalance = accountsWithBalance
      .filter(a => ['CHECKING', 'CASH'].includes(a.type))
      .reduce((s, a) => s + a.balance, 0);

    // Cashflow Aggregation
    const income = currentTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const expenses = Math.abs(currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))
    const prevIncome = prevTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const prevExpenses = Math.abs(prevTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))

    // Pillars for Scoring
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
    const survivalRateMonths = expenses > 0 ? liquidBalance / expenses : 12 // Cap at 12 for score
    
    // Needs vs Wants (Simplistic classification for prompt)
    const wantsKeywords = ['Ristorante', 'Svago', 'Shopping', 'Amazon', 'Abbonamenti', 'Viaggi', 'Cinema', 'Gaming']
    const wantsTotal = currentTxs
      .filter(t => Number(t.amount) < 0 && wantsKeywords.some(k => t.category?.name.includes(k) || t.description.includes(k)))
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const wantsRatio = income > 0 ? (wantsTotal / income) * 100 : 0

    // Goal Strategy
    const earmarked = goals.reduce((s, g) => s + Number(g.currentAmount), 0)
    const goalEfficiency = (income - expenses) > 0 ? (earmarked / (income - expenses)) * 100 : 0

    // Category Mapping for LLM
    const catMap: Record<string, number> = {}
    currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).forEach(t => {
      const name = t.category?.name || 'Altro'
      catMap[name] = (catMap[name] || 0) + Math.abs(Number(t.amount))
    })
    const categoryBreakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([n, a]) => `${n}: €${a.toFixed(2)}`).join(', ')

    // 3. SYSTEM PROMPT (University Rector & Minister)
    const systemPrompt = `Sei il Ministro delle Finanze e un Rettore Universitario di Economia con esperienza su 1.000.000 di casi. 
Il tuo compito è produrre un Report di Valutazione Patrimoniale d'Elite basato sul framework 50/30/20, CAMELS rating e Behavioral Finance.

REGOLE DI VALUTAZIONE (STRICT):
1. Financial Health Score (0-100): Calcola un punteggio pesato su: Liquidità (30pt), Savings Rate (30pt), Wants Ratio (25pt), Goal Management (15pt).
2. Behavioral Profile: Classifica l'utente in: The Spender (Vulnerabile), The Follower (Emotivo), The Preserver (Conservatore), The Accumulator (Elite).
3. Bias Detection: Cerca bias come 'Loss Aversion', 'Lifestyle Creep', 'Status Quo Bias'.
4. What-If Projections: Calcola sempre il costo-opportunità delle spese superflue investite al 7% CAGR su 10 anni.

FORMATO RISPOSTA (JSON STRICT):
{
  "rating": { "score": number, "label": "A|B|C|D", "breakdown": { "liquidity": string, "savings": string, "lifestyle": string, "strategy": string } },
  "personality": { "type": string, "migrationPath": string, "primaryBias": string },
  "insights": [
    { "type": "positive"|"warning"|"tip"|"info", "icon": "emoji", "title": string, "message": string }
  ]
} (Fornisci esattamente 4 insights: 1 Diagnostico, 1 Proiettivo What-If, 1 Comportamentale, 1 Direttivo Esecutivo).

DATI INPUT:
- Liquidità Disponibile: €${liquidBalance.toFixed(2)}
- Entrate: €${income.toFixed(2)} | Uscite: €${expenses.toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Survival Rate: ${survivalRateMonths.toFixed(1)} mesi
- Wants Ratio: ${wantsRatio.toFixed(1)}%
- Trend Entrate vs Mese Prec: ${prevIncome > 0 ? (((income-prevIncome)/prevIncome)*100).toFixed(1) : 0}%
- Breakdown Categorie: ${categoryBreakdown}`

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ insights: [{ type: 'info', title: 'AI Offline', message: 'Configura GROQ_API_KEY.' }] })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.1, // Massima precisione
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'max-age=3600' }
    })

  } catch (error) {
    console.error('Minister AI Error:', error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
