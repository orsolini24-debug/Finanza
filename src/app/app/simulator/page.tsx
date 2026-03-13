import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import SimulatorClient from '@/components/simulator/SimulatorClient'

export default async function SimulatorPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/signin')

  const workspace = await prisma.workspace.findFirst({ where: { members: { some: { userId: (session.user as any).id } } } })
  if (!workspace) redirect('/app/dashboard')

  // Recupera patrimonio netto attuale e risparmio medio ultimi 3 mesi
  const accounts = await prisma.account.findMany({ where: { workspaceId: workspace.id } })
  const txSums = await prisma.transaction.groupBy({
    by: ['accountId'],
    where: { accountId: { in: accounts.map(a => a.id) }, status: { in: ['CONFIRMED', 'STAGED'] } },
    _sum: { amount: true }
  })
  const sumMap = Object.fromEntries(txSums.map(r => [r.accountId, Number(r._sum.amount || 0)]))
  const netWorth = accounts.reduce((s, a) => s + Number(a.openingBal) + (sumMap[a.id] || 0), 0)

  // Risparmio medio ultimi 3 mesi
  const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const recentTxs = await prisma.transaction.findMany({
    where: { workspaceId: workspace.id, status: 'CONFIRMED', date: { gte: threeMonthsAgo }, isTransfer: false }
  })
  const income   = recentTxs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
  const expenses = Math.abs(recentTxs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0))
  const avgMonthlySavings = (income - expenses) / 3

  return <SimulatorClient initialNetWorth={netWorth} avgMonthlySavings={avgMonthlySavings} />
}