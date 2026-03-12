export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { TrendingUp, TrendingDown, Wallet, CalendarClock, PiggyBank, ClipboardCheck, HelpCircle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { getCurrentMonth, getPeriodRange, getDayRange, getQuarterRange, getYearRange, formatMonthLabel, getQuarterLabel, getYearLabel, type PeriodMode } from "@/lib/period";
import { processOverdueRecurring } from "@/lib/process-recurring";
import { getBudgetsWithSpending } from "@/app/actions/budgets";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tooltip } from "@/components/ui/Tooltip";
import AIInsights from "@/components/dashboard/AIInsights";
import { ChartCarousel } from "@/components/dashboard/ChartClient";
import { createDefaultWorkspace } from "@/lib/workspace";
import { SafeToSpendCard } from "@/components/dashboard/SafeToSpendCard";
import { Amount } from "@/components/ui/Amount";

export default async function Dashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const resolvedSearchParams = await searchParams;
  const month = (resolvedSearchParams.month as string) || getCurrentMonth();
  const day = resolvedSearchParams.day as string;
  const currentPeriod = (resolvedSearchParams.period as PeriodMode) || 'month';
  
  const { start, end } = day 
    ? getDayRange(month, day) 
    : currentPeriod === 'quarter' ? getQuarterRange(month)
    : currentPeriod === 'year' ? getYearRange(month)
    : getPeriodRange(month);

  const userId = (session.user as any).id;

  const workspaceIdRow = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    select: { id: true }
  });

  if (!workspaceIdRow) {
    try {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-[var(--expense)] mb-4">Sessione non valida</h2>
            <p className="text-[var(--fg-muted)] mb-6">Il database è stato resettato. Per favore, esegui il logout e registrati di nuovo.</p>
            <a href="/api/auth/signout" className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl">Esegui Logout</a>
          </div>
        );
      }
      await createDefaultWorkspace(userId);
      redirect("/app/dashboard");
    } catch (error) {
      console.error("Dashboard failed to auto-create workspace:", error);
      return <div className="p-8">Errore durante la creazione dello spazio di lavoro. Riprova più tardi.</div>;
    }
  }

  await processOverdueRecurring(workspaceIdRow.id);

  let workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      accounts: true,
      categories: true,
      goals: true,
      recurring: { orderBy: { nextDate: 'asc' }, take: 3 },
      transactions: {
        include: { category: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!workspace) return <div className="p-8">Nessun workspace trovato. Contatta l'assistenza.</div>;

  const accountsWithBalance = await Promise.all(workspace.accounts.map(async (acc) => {
    const aggregate = await prisma.transaction.aggregate({
      where: { accountId: acc.id, status: { in: ['CONFIRMED', 'STAGED'] } },
      _sum: { amount: true }
    });
    const balance = Number(acc.openingBal) + Number(aggregate._sum.amount || 0);
    return { ...acc, balance };
  }));

  if (accountsWithBalance.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="text-6xl">🏦</div>
          <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)]">Nessun conto configurato</h2>
          <p className="text-[var(--fg-muted)] font-medium max-w-sm">Aggiungi il tuo primo conto bancario per iniziare a tracciare le tue finanze.</p>
          <a href="/app/accounts" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-on)] font-bold rounded-2xl hover:shadow-[0_0_20px_var(--glow-accent)] transition-all">Aggiungi Conto</a>
        </div>
      </div>
    )
  }

  const liquidBalance = accountsWithBalance.filter(a => ['CHECKING', 'CASH'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const savingsBalance = accountsWithBalance.filter(a => a.type === 'SAVINGS').reduce((s, a) => s + a.balance, 0);
  const investmentBalance = accountsWithBalance.filter(a => a.type === 'INVESTMENT').reduce((s, a) => s + a.balance, 0);
  const debtBalance = accountsWithBalance.filter(a => ['LOAN', 'MORTGAGE'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const goalEarmarked = workspace.goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const availableLiquidity = liquidBalance - goalEarmarked;
  const currentTotalBalance = liquidBalance + savingsBalance + investmentBalance + debtBalance;

  const serializedCategories = workspace.categories.map(c => ({ ...c }));
  const serializedAccounts = workspace.accounts.map(a => ({ ...a, openingBal: Number(a.openingBal) }));

  const confirmedInPeriod = workspace.transactions.filter(t => t.status === 'CONFIRMED' && t.date >= start && t.date <= end);
  const stagedCount = workspace.transactions.filter(t => t.status === 'STAGED').length;
  const nonTransferInPeriod = confirmedInPeriod.filter(t => !t.isTransfer);
  const totalIncome = nonTransferInPeriod.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = nonTransferInPeriod.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0);
  
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  let runningNet = 0;
  const chartData = Array.from({ length: daysInPeriod }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayTxs = confirmedInPeriod.filter(t => t.date.toISOString().split('T')[0] === dateStr);
    const dayNet = dayTxs.reduce((s, t) => s + Number(t.amount), 0);
    runningNet += dayNet;
    return { name: String(d.getDate()), amount: parseFloat(runningNet.toFixed(2)), daily: dayNet };
  });

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).reverse();

  const monthlyData = await Promise.all(months.map(async (m) => {
    const { start: mStart, end: mEnd } = getPeriodRange(m);
    const txs = workspace.transactions.filter(t => t.status === 'CONFIRMED' && !t.isTransfer && t.date >= mStart && t.date <= mEnd);
    const inc = txs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const exp = txs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    return { month: m, income: inc, expenses: exp, net: inc - exp };
  }));

  const budgetData = await getBudgetsWithSpending(workspace.id, month);
  const topBudgets = [...budgetData].sort((a, b) => b.percentage - a.percentage).slice(0, 4);

  const totalBudgetReserved = budgetData.filter(b => b.category.type !== 'INCOME').reduce((s, b) => s + Math.max(0, Number(b.amount) - b.spent), 0);
  const allRecurring = await prisma.recurringItem.findMany({ where: { workspaceId: workspace.id, isIncome: false } });
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingRecurringTotal = allRecurring.filter(r => new Date(r.nextDate) >= now && new Date(r.nextDate) <= thirtyDaysFromNow).reduce((s, r) => s + Number(r.amount), 0);
  const safeToSpend = liquidBalance - totalBudgetReserved - upcomingRecurringTotal;

  const byCategory: Record<string, { name: string; amount: number }> = {};
  nonTransferInPeriod.filter(t => Number(t.amount) < 0).forEach(tx => {
    const key = tx.categoryId ?? '__uncategorized__';
    const name = tx.category?.name ?? 'Altro';
    if (!byCategory[key]) byCategory[key] = { name, amount: 0 };
    byCategory[key].amount += Math.abs(Number(tx.amount));
  });
  const topCategories = Object.values(byCategory).sort((a, b) => b.amount - a.amount);
  const pieData = topCategories.slice(0, 6).map(c => ({ name: c.name, amount: parseFloat(c.amount.toFixed(2)) }));
  if (topCategories.length > 6) {
    const others = topCategories.slice(6).reduce((s, c) => s + c.amount, 0);
    pieData.push({ name: 'Altro', amount: parseFloat(others.toFixed(2)) });
  }

  const currentLabel = currentPeriod === 'quarter' ? getQuarterLabel(month) : currentPeriod === 'year' ? getYearLabel(month) : formatMonthLabel(month);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-1000">
      <DashboardHeader totalNetWorth={currentTotalBalance} liquid={liquidBalance} available={availableLiquidity} savings={savingsBalance} investments={investmentBalance} earmarked={goalEarmarked} debts={debtBalance} categories={serializedCategories} accounts={serializedAccounts} userName={session.user?.name || (session.user?.email?.split('@')[0]) || undefined} workspaceId={workspace.id} currentMonth={month} />
      <SafeToSpendCard amount={safeToSpend} liquidBalance={liquidBalance} budgetReserved={totalBudgetReserved} upcomingExpenses={upcomingRecurringTotal} />
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard label="Saldo Periodo" tooltip="Differenza netta tra entrate e uscite." value={<Amount value={totalIncome + totalExpenses} />} icon={<Wallet className="text-blue-400" />} color="blue" />
        <StatCard label="Entrate" tooltip="Somma entrate del periodo." value={<Amount value={totalIncome} />} icon={<TrendingUp className="text-[var(--income)]" />} color="green" />
        <StatCard label="Uscite" tooltip="Somma uscite del periodo." value={<Amount value={Math.abs(totalExpenses)} />} icon={<TrendingDown className="text-[var(--expense)]" />} color="red" />
        <StatCard label="Da Verificare" tooltip="Transazioni non confermate." value={stagedCount.toString()} icon={<ClipboardCheck className="text-purple-400" />} color="purple" isWarning={stagedCount > 0} />
      </div>
      <AIInsights workspaceId={workspace.id} month={month} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8">
        <div className="xl:col-span-2">
          <ChartCarousel chartData={chartData} categoryData={pieData} monthlyData={monthlyData} currentMonthLabel={currentLabel} />
        </div>
        <div className="glass p-5 sm:p-6 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-[var(--warning)]/10 flex flex-col text-left">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--fg-primary)]">Budget</h2>
            <PiggyBank size={20} className="text-[var(--warning)]" />
          </div>
          <div className="flex-1 space-y-6">
            {topBudgets.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between items-end text-sm mb-2">
                  <span className="font-bold text-[var(--fg-primary)] truncate mr-2">{b.category.name}</span>
                  <span className={cn("text-[11px] font-black shrink-0", b.percentage < 75 ? "text-[var(--income)]" : b.percentage < 100 ? "text-[var(--warning)]" : "text-[var(--expense)]")}>{Math.round(b.percentage)}%</span>
                </div>
                <div className="w-full bg-[var(--bg-input)] rounded-full h-1.5 overflow-hidden border border-[var(--border-subtle)]">
                  <div className={cn("h-full rounded-full transition-all duration-300", b.percentage < 75 ? "bg-[var(--income)]" : b.percentage < 100 ? "bg-[var(--warning)]" : "bg-[var(--expense)]")} style={{ width: `${Math.min(100, b.percentage)}%` }} />
                </div>
              </div>
            ))}
            {topBudgets.length === 0 && <p className="text-center text-[var(--fg-muted)] py-10 text-sm italic">Nessun budget configurato</p>}
          </div>
          <a href="/app/budget" className="block text-center text-xs font-bold text-[var(--accent)] hover:underline mt-6">Gestisci Budget →</a>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8 pb-20">
        <div className="glass p-5 sm:p-6 lg:p-8 rounded-[2rem] md:rounded-[3rem] text-left">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--fg-primary)]">Scadenze</h2>
            <CalendarClock size={20} className="text-[var(--accent)]" />
          </div>
          <div className="space-y-4">
            {workspace.recurring.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--bg-elevated)]/50 rounded-2xl border border-[var(--border-subtle)]">
                <div>
                  <p className="text-sm font-bold text-[var(--fg-primary)]">{item.name}</p>
                  <p className="text-[10px] text-[var(--fg-muted)] font-medium uppercase whitespace-nowrap">{new Date(item.nextDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className={cn("font-mono font-bold text-sm", item.isIncome ? "text-[var(--income)]" : "text-[var(--expense)]")}>
                  <Amount value={Number(item.amount)} prefix={item.isIncome ? '+' : '-'} hideLabel />
                </div>
              </div>
            ))}
            {workspace.recurring.length === 0 && <p className="text-center text-[var(--fg-muted)] py-6 text-xs italic">Nessun pagamento ricorrente</p>}
          </div>
          <a href="/app/recurring" className="block text-center text-xs font-bold text-[var(--accent)] hover:underline mt-6">Vedi tutte →</a>
        </div>
        <div className="glass p-5 sm:p-6 lg:p-8 rounded-[2rem] md:rounded-[3rem] xl:col-span-2 text-left">
          <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--fg-primary)] mb-4 md:mb-6">Attività Recente</h2>
          <div className="space-y-4">
            {confirmedInPeriod.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between group p-3 hover:bg-[var(--bg-elevated)]/50 rounded-2xl transition-all">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm shrink-0", Number(tx.amount) < 0 ? "bg-[var(--expense-dim)] text-[var(--expense)]" : "bg-[var(--income-dim)] text-[var(--income)]")}>{tx.category?.name ? tx.category.name.slice(0, 2).toUpperCase() : (Number(tx.amount) < 0 ? '−' : '+')}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--fg-primary)] truncate">{tx.description}</p>
                    <p className="text-[10px] text-[var(--fg-muted)] font-medium uppercase">{new Date(tx.date).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
                <div className={cn("font-mono font-bold text-base tracking-tighter", Number(tx.amount) < 0 ? "text-[var(--expense)]" : "text-[var(--income)]")}>
                  <Amount value={Math.abs(Number(tx.amount))} prefix={Number(tx.amount) > 0 ? '+' : ''} hideLabel />
                </div>
              </div>
            ))}
            {confirmedInPeriod.length === 0 && <div className="text-center py-10"><p className="text-[var(--fg-muted)] text-sm italic">Nessuna transazione nel periodo</p></div>}
          </div>
          <a href="/app/transactions" className="block text-center text-xs font-bold text-[var(--accent)] hover:underline mt-6">Vedi attività completa →</a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, isWarning, tooltip }: any) {
  const colorMap: any = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-[var(--income-dim)] text-[var(--income)] border-[var(--income)]/20",
    red: "bg-[var(--expense-dim)] text-[var(--expense)] border-[var(--expense)]/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  }
  return (
    <div className={cn("glass p-3 sm:p-4 md:p-6 rounded-[2rem] border border-[var(--border-subtle)] transition-all duration-500", isWarning && "border-yellow-500/30 bg-yellow-500/5 animate-pulse")}>
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className={cn("p-2 sm:p-3 rounded-2xl shrink-0", colorMap[color])}>{icon}</div>
      </div>
      <Tooltip content={tooltip} side="bottom">
        <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mb-1 cursor-help inline-flex items-center gap-1 leading-tight">{label}{tooltip && <HelpCircle size={10} className="opacity-50" />}</p>
      </Tooltip>
      <div className="text-base sm:text-xl md:text-2xl font-mono font-black tracking-tighter text-[var(--fg-primary)] truncate">{value}</div>
    </div>
  )
}
