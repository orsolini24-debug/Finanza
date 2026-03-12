export const dynamic = 'force-dynamic'

import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { getPeriodRange } from "@/lib/period"
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workspaceId, month } = await req.json()
    const { start, end } = getPeriodRange(month)

    // ── 1. DATA ACQUISITION ──────────────────────────────────────
    const [currentTxs, accounts, goals, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { workspaceId, status: 'CONFIRMED', date: { gte: start, lte: end } },
        include: { category: true }
      }),
      prisma.account.findMany({ where: { workspaceId } }),
      prisma.goal.findMany({ where: { workspaceId } }),
      prisma.budget.findMany({ where: { workspaceId }, include: { category: true } })
    ])

    // Previous months (trend analysis)
    const prevDate = new Date(start); prevDate.setMonth(prevDate.getMonth() - 1)
    const { start: pStart, end: pEnd } = getPeriodRange(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`)
    const prev2Date = new Date(start); prev2Date.setMonth(prev2Date.getMonth() - 2)
    const { start: p2Start, end: p2End } = getPeriodRange(`${prev2Date.getFullYear()}-${String(prev2Date.getMonth() + 1).padStart(2, '0')}`)

    const [prevTxs, prev2Txs] = await Promise.all([
      prisma.transaction.findMany({ where: { workspaceId, status: 'CONFIRMED', date: { gte: pStart, lte: pEnd } } }),
      prisma.transaction.findMany({ where: { workspaceId, status: 'CONFIRMED', date: { gte: p2Start, lte: p2End } } })
    ])

    // ── 2. OPTIMIZED QUANTITATIVE CALCULATIONS ───────────────────

    // Account balances (Fix N+1 using groupBy)
    const txBalances = await prisma.transaction.groupBy({
      by: ['accountId'],
      where: { workspaceId, status: { in: ['CONFIRMED', 'STAGED'] } },
      _sum: { amount: true }
    })

    const balanceMap = Object.fromEntries(txBalances.map(b => [b.accountId, Number(b._sum.amount || 0)]))
    const accountsWithBalance = accounts.map(acc => ({
      ...acc,
      balance: Number(acc.openingBal) + (balanceMap[acc.id] || 0)
    }))

    const liquidBalance = accountsWithBalance.filter(a => ['CHECKING', 'CASH'].includes(a.type)).reduce((s, a) => s + a.balance, 0)
    const savingsBalance = accountsWithBalance.filter(a => a.type === 'SAVINGS').reduce((s, a) => s + a.balance, 0)
    const investBalance = accountsWithBalance.filter(a => a.type === 'INVESTMENT').reduce((s, a) => s + a.balance, 0)
    const debtBalance = Math.abs(accountsWithBalance.filter(a => ['LOAN', 'MORTGAGE'].includes(a.type)).reduce((s, a) => s + a.balance, 0))
    const netWorth = accountsWithBalance.reduce((s, a) => s + a.balance, 0)

    // Cash flow
    const income = currentTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const expenses = Math.abs(currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))
    const prevIncome = prevTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const prevExpenses = Math.abs(prevTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))
    const prev2Income = prev2Txs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const prev2Expenses = Math.abs(prev2Txs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))

    // Ratios & Trends
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
    const survivalMonths = expenses > 0 ? liquidBalance / expenses : 12
    const expenseTrend = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0
    const incomeTrend = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0
    const avg3MonthSavings = ((income - expenses) + (prevIncome - prevExpenses) + (prev2Income - prev2Expenses)) / 3

    // Needs vs Wants
    const wantsKeywords = ['Ristorante', 'Svago', 'Shopping', 'Amazon', 'Abbonamenti', 'Viaggi', 'Cinema', 'Gaming', 'Bar', 'Caffè', 'Aperitivo', 'Hobby', 'Streaming', 'Abbonamento']
    const wantsTotal = currentTxs.filter(t => Number(t.amount) < 0 && wantsKeywords.some(k => t.category?.name?.toLowerCase().includes(k.toLowerCase()) || t.description.toLowerCase().includes(k.toLowerCase()))).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const needsTotal = expenses - wantsTotal
    const wantsRatio = income > 0 ? (wantsTotal / income) * 100 : 0
    const needsRatio = income > 0 ? (needsTotal / income) * 100 : 0

    // Goals & Budgets details
    const totalGoalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0)
    const totalGoalCurrent = goals.reduce((s, g) => s + Number(g.currentAmount), 0)
    const goalProgress = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0
    const goalDetails = goals.slice(0, 3).map(g => `${g.name}: €${Number(g.currentAmount).toFixed(0)} / €${Number(g.targetAmount).toFixed(0)} (${((Number(g.currentAmount) / Number(g.targetAmount)) * 100).toFixed(0)}%)`).join('; ')

    // Budget fix N+1 (use currentTxs already in memory)
    const budgetDetails = budgets.slice(0, 5).map(b => {
      const spent = currentTxs.filter(t => t.categoryId === b.categoryId && Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      const pct = Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0
      return `${b.category?.name || 'N/D'}: €${spent.toFixed(0)} / €${Number(b.amount).toFixed(0)} (${pct.toFixed(0)}%)`
    }).join('; ')

    // Category breakdown
    const catMap: Record<string, number> = {}
    currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).forEach(t => {
      const name = t.category?.name || 'Non categorizzato'
      catMap[name] = (catMap[name] || 0) + Math.abs(Number(t.amount))
    })
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, a]) => `${n}: €${a.toFixed(2)}`).join('; ')

    const monthLabel = new Date(start).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

    const systemPrompt = `Sei un consulente finanziario personale di alto livello. Analisi mese di ${monthLabel}.
COMPITO: Restituisci ESCLUSIVAMENTE un oggetto JSON valido.
(Resto del prompt identico...)`

    if (!process.env.GOOGLE_AI_API_KEY && !process.env.GROQ_API_KEY) {
      return NextResponse.json({ insights: [{ type: 'info', icon: '🔑', title: 'AI non configurata', message: 'Configura GOOGLE_AI_API_KEY.', detail: 'Aggiungi la chiave API.', action: 'Vedi documentazione' }] })
    }

    let raw: string
    if (process.env.GOOGLE_AI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { responseMimeType: 'application/json', temperature: 0.25 } })
      const res = await model.generateContent(systemPrompt + JSON.stringify({ netWorth, liquidBalance, savingsBalance, income, expenses, savingsRate, survivalMonths, wantsTotal, needsTotal, topCategories }))
      raw = res.response.text()
    } else {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
      const completion = await groq.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt + JSON.stringify({ netWorth, liquidBalance, savingsBalance, income, expenses, savingsRate, survivalMonths, wantsTotal, needsTotal, topCategories }) }], temperature: 0.25, response_format: { type: 'json_object' } })
      raw = completion.choices[0]?.message?.content || '{}'
    }

    return NextResponse.json(JSON.parse(raw), { headers: { 'Cache-Control': 'max-age=1800' } })

  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
