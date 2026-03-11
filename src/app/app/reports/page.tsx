import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BarChart3, TrendingUp, TrendingDown, Target, PieChart } from "lucide-react";
import { ReportsClient } from "@/components/reports/ReportsClient";
import CashFlowChart from "@/components/reports/CashFlowChart";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const userId = (session.user as any).id;
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      accounts: true,
      recurring: true,
      categories: true
    }
  });

  if (!workspace) return <div className="p-8">Nessun workspace trovato. Contatta l'assistenza.</div>;

  // Saldo attuale totale per la proiezione
  const accountsWithBalances = await Promise.all(workspace.accounts.map(async (acc) => {
    const aggregate = await prisma.transaction.aggregate({
      where: {
        accountId: acc.id,
        status: { in: ['CONFIRMED', 'STAGED'] }
      },
      _sum: {
        amount: true
      }
    });
    return {
      ...acc,
      openingBal: Number(acc.openingBal),
      balance: Number(acc.openingBal) + Number(aggregate._sum.amount || 0)
    };
  }));
  const currentBalance = accountsWithBalances.reduce((sum, acc) => sum + acc.balance, 0);

  // Calcolo dati ultimi 6 mesi
  const confirmedTxs = await prisma.transaction.findMany({
    where: { workspaceId: workspace.id, status: 'CONFIRMED' }
  });

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('it-IT', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    };
  }).reverse();

  const historyData = months.map((m) => {
    const start = new Date(Date.UTC(m.year, m.month, 1));
    const end = new Date(Date.UTC(m.year, m.month + 1, 0, 23, 59, 59));

    const txs = confirmedTxs.filter(t => t.date >= start && t.date <= end);

    const income = txs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = Math.abs(txs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0));

    return {
      name: m.label,
      income: parseFloat(income.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      savings: parseFloat((income - expenses).toFixed(2))
    };
  });

  // Top 5 categorie di spesa (totale ultimi 6 mesi)
  // Problem #16 - Aggregate subcategories into parents
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const txsForCategories = confirmedTxs.filter(t => t.date >= sixMonthsAgo && Number(t.amount) < 0);
  const catSums: Record<string, number> = {};

  txsForCategories.forEach(tx => {
    if (!tx.categoryId) return;
    let cat = workspace.categories.find(c => c.id === tx.categoryId);
    // Traverse up to find top level parent
    while (cat?.parentId) {
      const parent = workspace.categories.find(c => c.id === cat!.parentId);
      if (parent) cat = parent;
      else break;
    }
    const catId = cat?.id || 'other';
    catSums[catId] = (catSums[catId] || 0) + Math.abs(Number(tx.amount));
  });

  const topCategories = Object.entries(catSums)
    .map(([id, amount]) => ({
      name: workspace.categories.find(c => c.id === id)?.name || 'Altro',
      amount: parseFloat(amount.toFixed(2))
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Metriche — escludi mesi senza movimentazioni per evitare statistiche fuorvianti
  const activeMonths = historyData.filter(d => d.income > 0 || d.expenses > 0);
  const avgSavings = activeMonths.length > 0
    ? activeMonths.reduce((s, d) => s + d.savings, 0) / activeMonths.length
    : 0;
  const bestMonth = activeMonths.length > 0
    ? [...activeMonths].sort((a, b) => b.savings - a.savings)[0]
    : null;
  const totalIncomePeriod = activeMonths.reduce((s, d) => s + d.income, 0);
  const totalExpensesPeriod = activeMonths.reduce((s, d) => s + d.expenses, 0);

  const savingsRate = totalIncomePeriod > 0
    ? Math.max(0, ((totalIncomePeriod - totalExpensesPeriod) / totalIncomePeriod) * 100)
    : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-[var(--accent)] rounded-[2rem] shadow-[0_0_30px_var(--glow-accent)] text-[var(--accent-on)]">
          <BarChart3 size={32} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[var(--fg-primary)] tracking-tight">Report & Analisi</h1>
          <p className="text-[var(--fg-muted)] font-medium">Analisi storica e proiezioni future</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Risparmio Medio" value={activeMonths.length > 0 ? avgSavings : null} icon={<TrendingUp size={20} />} />
        <MetricCard label="Mese Migliore" value={bestMonth?.name || '-'} isText icon={<Target size={20} />} />
        <MetricCard label="Top Categoria" value={topCategories[0]?.name || '-'} isText icon={<PieChart size={20} />} />
        <MetricCard label="Tasso di Risparmio" value={`${Math.round(savingsRate)}%`} isText icon={<TrendingUp size={20} />} />
      </div>

      <CashFlowChart currentBalance={currentBalance} recurringItems={workspace.recurring.map(r => ({ ...r, amount: Number(r.amount) })) as any} />

      <ReportsClient 
        historyData={historyData} 
        topCategories={topCategories} 
      />
    </div>
  );
}

function MetricCard({ label, value, isText, icon }: any) {
  const displayValue = value === null || value === undefined
    ? <span className="text-[var(--fg-subtle)] text-base font-medium italic">Dati insufficienti</span>
    : typeof value === 'number' && !isText
      ? formatCurrency(value)
      : value;

  return (
    <div className="glass p-6 rounded-[2rem] border border-[var(--border-subtle)]">
      <div className="flex items-center gap-3 mb-3 text-[var(--fg-subtle)]">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-display font-black text-[var(--fg-primary)]">
        {displayValue}
      </p>
    </div>
  );
}
