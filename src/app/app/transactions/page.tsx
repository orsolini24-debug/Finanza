export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TransactionsTable from "@/components/TransactionsTable";
import { getCurrentMonth, getPeriodRange, getDayRange, getQuarterRange, getYearRange, type PeriodMode } from "@/lib/period";
import { getSuggestedRules } from "@/app/actions/transactions";
import { detectTransferCandidates } from "@/app/actions/transfers";
import RuleSuggestions from "@/components/transactions/RuleSuggestions";
import TransferSuggestions from "@/components/transactions/TransferSuggestions";
import SearchBar from "@/components/transactions/SearchBar";

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const resolvedSearchParams = await searchParams;
  const month = (resolvedSearchParams.month as string) || getCurrentMonth();
  const day = resolvedSearchParams.day as string;
  const period = (resolvedSearchParams.period as PeriodMode) || 'month';
  
  const { start, end } = day 
    ? getDayRange(month, day) 
    : period === 'quarter' ? getQuarterRange(month)
    : period === 'year' ? getYearRange(month)
    : getPeriodRange(month);

  const userId = (session.user as any).id;
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      accounts: { orderBy: { name: 'asc' } },
      categories: { orderBy: { name: 'asc' } },
      transactions: {
        where: {
          date: { gte: start, lte: end }
        },
        include: { category: true, account: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!workspace) return <div className="p-8">Nessun workspace trovato. Contatta l'assistenza.</div>;

  const suggestions = await getSuggestedRules(workspace.id);
  const transferCandidates = await detectTransferCandidates();

  // Serialize Decimal fields before passing to Client Components
  const transactions = workspace.transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    account: { ...t.account, openingBal: Number(t.account.openingBal) },
  }));
  const categories = workspace.categories.map(c => ({ ...c }));
  const accounts = workspace.accounts.map(a => ({ ...a, openingBal: Number(a.openingBal) }));

  const stagedCount = transactions.filter(t => t.status === 'STAGED').length;
  const defaultStatus = stagedCount > 0 ? 'STAGED' : 'ALL';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[var(--fg-primary)] tracking-tight">
            Transazioni
          </h1>
          <p className="text-[var(--fg-muted)] mt-2 font-medium">
            {stagedCount > 0
              ? `${stagedCount} moviment${stagedCount === 1 ? 'o' : 'i'} da confermare · ${transactions.length - stagedCount} registrat${transactions.length - stagedCount === 1 ? 'o' : 'i'} nel periodo`
              : 'Movimenti registrati nel periodo selezionato.'}
          </p>
        </div>
        <div className="flex-1 w-full md:max-w-md mt-4 md:mt-0">
          <SearchBar workspaceId={workspace.id} />
        </div>
      </div>

      <RuleSuggestions suggestions={suggestions} />
      <TransferSuggestions candidates={transferCandidates} />

      <TransactionsTable
        transactions={transactions as any}
        categories={categories}
        accounts={accounts as any}
        defaultStatus={defaultStatus as any}
      />
    </div>
  );
}
