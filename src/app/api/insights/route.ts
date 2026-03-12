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

    // Recupero Conti per Liquidità (Fondo Emergenza)
    const accounts = await prisma.account.findMany({
      where: { workspaceId }
    })
    
    // Ricalcolo saldi reali per ogni account
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

    // Aggregazione dati per il prompt
    const income = currentTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const expenses = Math.abs(currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))
    const prevIncome = prevTxs.filter(t => Number(t.amount) > 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0)
    const prevExpenses = Math.abs(prevTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).reduce((s, t) => s + Number(t.amount), 0))

    const savingsRate = income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0;

    const catMap: Record<string, number> = {}
    currentTxs.filter(t => Number(t.amount) < 0 && !t.isTransfer).forEach(t => {
      const name = t.category?.name || 'Altro'
      catMap[name] = (catMap[name] || 0) + Math.abs(Number(t.amount))
    })
    
    // Lista completa delle categorie per l'IA (per applicare 50/30/20)
    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([n, a]) => `${n} (€${a.toFixed(2)})`).join(', ')

    const systemPrompt = `Sei un Consulente Finanziario Personale Elite con anni di esperienza nel Wealth Management e oltre 10.000 casi di successo alle spalle. 
Il tuo compito è analizzare i flussi di cassa dell'utente e fornire esattamente 4 insight chirurgici, professionali e basati su algoritmi finanziari reali (come la regola 50/30/20, l'analisi del Savings Rate e il dimensionamento dell'Emergency Fund).

REGOLE DI ANALISI:
1. Savings Rate (Tasso di risparmio): Valuta se è <10% (Pericolo), 10-20% (Nella norma), >20% (Eccellente verso il FIRE).
2. Regola 50/30/20: Analizza le categorie fornite e deduci se c'è un eccesso nei "Wants" (Svago, Shopping, Ristoranti) o se i "Needs" (Affitto, Spesa, Utenze) sono troppo alti.
3. Fondo di Emergenza: L'utente dovrebbe avere 3-6 mesi di spese coperte dalla sua liquidità attuale. Valuta se è a rischio.
4. Tono: Autorevole, analitico, incoraggiante ma severo se necessario. Niente frasi fatte. Usa dati numerici.

FORMATO RISPOSTA (JSON STRICT):
Restituisci ESATTAMENTE questo JSON object con un array "insights" di 4 elementi:
{
  "insights": [
    { 
      "type": "positive" | "warning" | "tip" | "info", 
      "icon": "<un'emoji appropriata>", 
      "title": "<Titolo breve e incisivo>", 
      "message": "<Messaggio dettagliato, analitico, max 2 frasi, che include il ragionamento matematico o la regola applicata>" 
    }
  ]
}

DATI FINANZIARI DELL'UTENTE (Mese in corso):
- Liquidità Immediata Disponibile (Conti Correnti + Contanti): €${liquidBalance.toFixed(2)}
- Entrate Mese: €${income.toFixed(2)}
- Uscite Mese: €${expenses.toFixed(2)}
- Risparmio Netto Mese: €${(income - expenses).toFixed(2)}
- Tasso di Risparmio (Savings Rate): ${savingsRate}%
- Entrate Mese Precedente: €${prevIncome.toFixed(2)}
- Uscite Mese Precedente: €${prevExpenses.toFixed(2)}

SPESE PER CATEGORIA (Mese in corso):
${categories || 'Nessuna spesa registrata.'}

Analizza profondamente e genera i 4 insight migliori possibili.`

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        insights: [
          { type: 'info', icon: '💡', title: 'Configurazione AI', message: 'Configura GROQ_API_KEY per attivare gli insight avanzati basati su algoritmi finanziari.' },
          { type: 'positive', icon: '💰', title: 'Analisi Pronta', message: 'Il sistema è pronto per analizzare i tuoi flussi di cassa con logiche di wealth management.' }
        ] 
      })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.2, // Basso per risposte matematiche/razionali
      max_tokens: 800,
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
