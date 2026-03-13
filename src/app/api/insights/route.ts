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

    // Previous month (trend analysis)
    const prevDate = new Date(start)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const { start: pStart, end: pEnd } = getPeriodRange(prevMonthStr)
    const prevTxs = await prisma.transaction.findMany({
      where: { workspaceId, status: 'CONFIRMED', date: { gte: pStart, lte: pEnd } }
    })

    // 2 months ago (for 3-month trend)
    const prev2Date = new Date(start)
    prev2Date.setMonth(prev2Date.getMonth() - 2)
    const prev2MonthStr = `${prev2Date.getFullYear()}-${String(prev2Date.getMonth() + 1).padStart(2, '0')}`
    const { start: p2Start, end: p2End } = getPeriodRange(prev2MonthStr)
    const prev2Txs = await prisma.transaction.findMany({
      where: { workspaceId, status: 'CONFIRMED', date: { gte: p2Start, lte: p2End } }
    })

    // ── 2. QUANTITATIVE CALCULATIONS ─────────────────────────────

    // Account balances
    const txSums = await prisma.transaction.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: accounts.map(a => a.id) },
        status: { in: ['CONFIRMED', 'STAGED'] }
      },
      _sum: { amount: true }
    })
    const sumMap = Object.fromEntries(txSums.map(r => [r.accountId, Number(r._sum.amount || 0)]))
    const accountsWithBalance = accounts.map(acc => ({
      ...acc,
      balance: Number(acc.openingBal) + (sumMap[acc.id] || 0)
    }))

    const liquidBalance = accountsWithBalance
      .filter(a => ['CHECKING', 'CASH'].includes(a.type))
      .reduce((s, a) => s + a.balance, 0)
    const savingsBalance = accountsWithBalance
      .filter(a => a.type === 'SAVINGS')
      .reduce((s, a) => s + a.balance, 0)
    const investBalance = accountsWithBalance
      .filter(a => a.type === 'INVESTMENT')
      .reduce((s, a) => s + a.balance, 0)
    const debtBalance = Math.abs(accountsWithBalance
      .filter(a => ['LOAN', 'MORTGAGE'].includes(a.type))
      .reduce((s, a) => s + a.balance, 0))
    const netWorth = accountsWithBalance.reduce((s, a) => s + a.balance, 0)

    // Cash flow
    const income      = currentTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const expenses    = Math.abs(currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))
    const prevIncome  = prevTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const prevExpenses= Math.abs(prevTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))
    const prev2Income = prev2Txs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const prev2Expenses=Math.abs(prev2Txs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))

    // Key ratios
    const savingsRate     = income > 0 ? ((income - expenses) / income) * 100 : 0
    const survivalMonths  = expenses > 0 ? liquidBalance / expenses : 12
    const expenseTrend    = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0
    const incomeTrend     = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0

    // 3-month average savings
    const avg3MonthSavings = ((income - expenses) + (prevIncome - prevExpenses) + (prev2Income - prev2Expenses)) / 3

    // Needs vs Wants classification
    const wantsKeywords = ['Ristorante', 'Svago', 'Shopping', 'Amazon', 'Abbonamenti', 'Viaggi', 'Cinema', 'Gaming', 'Bar', 'Caffè', 'Aperitivo', 'Hobby', 'Streaming', 'Abbonamento']
    const wantsTotal    = currentTxs
      .filter(t => Number(t.amount) < 0 && wantsKeywords.some(k => t.category?.name?.toLowerCase().includes(k.toLowerCase()) || t.description.toLowerCase().includes(k.toLowerCase())))
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const needsTotal    = expenses - wantsTotal
    const wantsRatio    = income > 0 ? (wantsTotal / income) * 100 : 0
    const needsRatio    = income > 0 ? (needsTotal / income) * 100 : 0

    // Goals
    const totalGoalTarget   = goals.reduce((s, g) => s + Number(g.targetAmount), 0)
    const totalGoalCurrent  = goals.reduce((s, g) => s + Number(g.currentAmount), 0)
    const goalProgress      = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0
    const goalDetails       = goals.slice(0, 3).map(g => `${g.name}: €${Number(g.currentAmount).toFixed(0)} / €${Number(g.targetAmount).toFixed(0)} (${((Number(g.currentAmount) / Number(g.targetAmount)) * 100).toFixed(0)}%)`).join('; ')

    // Budget adherence
    const budgetDetails = budgets.slice(0, 5).map(b => {
      const spent = currentTxs
        .filter(t => t.categoryId === b.categoryId && Number(t.amount) < 0)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      const pct = Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0
      return `${b.category?.name || 'N/D'}: €${spent.toFixed(0)} / €${Number(b.amount).toFixed(0)} (${pct.toFixed(0)}%)`
    }).join('; ')

    // Category breakdown (top 8 expenses)
    const catMap: Record<string, number> = {}
    currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).forEach(t => {
      const name = t.category?.name || 'Non categorizzato'
      catMap[name] = (catMap[name] || 0) + Math.abs(Number(t.amount))
    })
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n, a]) => `${n}: €${a.toFixed(2)}`)
      .join('; ')

    // Month label for natural language
    const [y, m] = month.split('-').map(Number)
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

    // ── 3. PROMPT ────────────────────────────────────────────────
    const systemPrompt = `Sei un consulente finanziario personale d'élite, ex trader istituzionale e pianificatore patrimoniale. Stai conducendo un colloquio confidenziale con il tuo cliente per analizzare la sua situazione finanziaria del mese di ${monthLabel}.

Il tuo stile è professionale ma diretto, come un amico esperto che non ti racconta bugie per farti sentire bene. Usi sempre numeri reali e specifici. Mai testo generico: ogni frase deve contenere un dato concreto o un'implicazione pratica.

COMPITO:
Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questa struttura esatta:

{
  "rating": {
    "score": numero intero 0-100,
    "label": "A" oppure "B" oppure "C" oppure "D",
    "breakdown": {
      "liquidity": "una parola: Eccellente / Buona / Sufficiente / Critica",
      "savings": "una parola: Eccellente / Buona / Sufficiente / Assente",
      "lifestyle": "una parola: Controllato / Moderato / Elevato / Critico",
      "strategy": "una parola: Efficiente / Presente / Debole / Assente"
    }
  },
  "personality": {
    "type": "un nome evocativo in italiano (es. Il Costruttore Silenzioso, Lo Spendaccione Inconsapevole, Il Conservatore Prudente, Il Visionario Squilibrato)",
    "description": "testo discorsivo di 3-4 frasi che descrive questo profilo comportamentale, usando i dati reali del cliente. Scritto in seconda persona, come se parlassi direttamente con lui. Senza simboli speciali, solo testo fluente.",
    "migrationPath": "frase breve: dove si trova ora e dove può arrivare (es. Da risparmiatore passivo a investitore attivo)",
    "primaryBias": "nome del bias + spiegazione in 1 frase semplice (es. Status Quo Bias: tendi a lasciare le cose come stanno anche quando cambiare ti converrebbe)"
  },
  "insights": [
    {
      "type": "positive" oppure "warning" oppure "tip" oppure "info",
      "icon": "emoji singola pertinente",
      "title": "titolo breve e diretto, max 40 caratteri",
      "message": "1-2 frasi incisive per la card riassuntiva, max 130 caratteri, con un dato numerico reale del cliente",
      "detail": "testo discorsivo completo per il modal. OBBLIGATORIAMENTE contiene: (1) cifra esatta del problema o dell'opportunità rilevata, (2) confronto specifico con benchmark italiano o europeo, (3) simulazione matematica con i numeri reali del cliente (es. se risparmi €X/mese al 7% annuo per N anni, ottieni €Y), (4) il costo reale dell'inazione (quanto perdi/rischi se non agisci), (5) l'azione specifica con importo e tempistica. Minimo 450 caratteri. Solo prosa fluente, senza simboli o elenchi.",
      "action": "una sola azione concreta e immediata, formulata come istruzione diretta con importo specifico se applicabile (es. Imposta un bonifico automatico di €150 verso il tuo conto risparmio ogni primo del mese)"
    }
  ]
}

REGOLA FONDAMENTALE SUL TESTO: Tutto il testo deve essere leggibile ad alta voce in modo naturale. Nessun asterisco, nessun hashtag, nessuna formula matematica con simboli, nessun elenco puntato o numerato, nessuna parola in MAIUSCOLO tranne dove grammaticalmente corretto. Solo testo fluente come in una conversazione.

FORNISCI ESATTAMENTE 4 INSIGHTS nell'ordine:
1. Insight diagnostico (analisi di cosa sta succedendo ora)
2. Insight proiettivo con what-if (cosa succede se continua così o se cambia)
3. Insight comportamentale (un pattern o abitudine rilevata nei dati)
4. Insight direttivo (l'azione più importante da fare subito)

DATI FINANZIARI DEL CLIENTE — mese di ${monthLabel}:

Patrimonio netto totale: €${netWorth.toFixed(2)}
Liquidità (conti correnti e contanti): €${liquidBalance.toFixed(2)}
Risparmi (conti risparmio): €${savingsBalance.toFixed(2)}
Investimenti: €${investBalance.toFixed(2)}
Debiti (mutui e prestiti): €${debtBalance.toFixed(2)}

Entrate del mese: €${income.toFixed(2)}
Uscite del mese: €${expenses.toFixed(2)}
Risparmio netto del mese: €${(income - expenses).toFixed(2)}
Tasso di risparmio: ${savingsRate.toFixed(1)}%
Mesi di sopravvivenza con la liquidità attuale: ${survivalMonths.toFixed(1)}

Spese "voluttuarie" (svago, ristoranti, shopping, abbonamenti): €${wantsTotal.toFixed(2)} (${wantsRatio.toFixed(1)}% del reddito)
Spese "necessarie" (casa, salute, trasporti, utility): €${needsTotal.toFixed(2)} (${needsRatio.toFixed(1)}% del reddito)

Trend rispetto al mese precedente — entrate: ${prevIncome > 0 ? (incomeTrend >= 0 ? '+' : '') + incomeTrend.toFixed(1) : 'N/D'}%, uscite: ${prevExpenses > 0 ? (expenseTrend >= 0 ? '+' : '') + expenseTrend.toFixed(1) : 'N/D'}%
Risparmio medio ultimi 3 mesi: €${avg3MonthSavings.toFixed(2)}/mese

Dettaglio spese per categoria: ${topCategories || 'nessuna transazione categorizzata'}
${budgetDetails ? `Budget impostati: ${budgetDetails}` : ''}
${goalDetails ? `Obiettivi di risparmio: ${goalDetails} (progresso totale: ${goalProgress.toFixed(0)}%)` : ''}

BENCHMARK DI RIFERIMENTO (usali nel testo):
- Tasso di risparmio medio italiano: 8-10% del reddito
- Fondo di emergenza consigliato: 3-6 mesi di spese
- Regola 50/30/20: max 50% necessità, max 30% voluttuario, min 20% risparmio
- Rendimento storico azionario globale: 7% annuo reale su orizzonti 10+ anni
- Inflazione media europea: circa 2-3% annuo`

    if (!process.env.GOOGLE_AI_API_KEY && !process.env.GROQ_API_KEY) {
      return NextResponse.json({
        insights: [{
          type: 'info',
          icon: '🔑',
          title: 'AI non configurata',
          message: 'Configura GOOGLE_AI_API_KEY o GROQ_API_KEY nelle variabili d\'ambiente.',
          detail: 'Per attivare l\'analisi AI, aggiungi la variabile GOOGLE_AI_API_KEY al tuo file .env.local.',
          action: 'Aggiungi GOOGLE_AI_API_KEY=... al file .env.local'
        }]
      })
    }

    let raw: string = ''
    let aiError: any = null

    // Try Google Gemini first
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.25,
            maxOutputTokens: 3000,
          }
        })
        const result = await model.generateContent(systemPrompt)
        raw = result.response.text()
      } catch (err) {
        console.error('Gemini AI Error, falling back to Groq if available:', err)
        aiError = err
      }
    }

    // Fallback to Groq if Gemini failed or key was missing
    if (!raw && process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.25,
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        })
        raw = completion.choices[0]?.message?.content || '{}'
      } catch (err) {
        console.error('Groq AI Error:', err)
        aiError = err
      }
    }

    if (!raw) {
      throw aiError || new Error('Nessun provider AI disponibile o errore nel caricamento')
    }

    const result = JSON.parse(raw)

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'max-age=1800' }
    })

  } catch (error) {
    // Sentry.captureException(error)
    console.error('AI Insights Error:', error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
