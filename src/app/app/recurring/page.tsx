import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import RecurringManager from "@/components/recurring/RecurringManager";
import { RefreshCw } from "lucide-react";

export default async function RecurringPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const userId = (session.user as any).id;
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      categories: { orderBy: { name: 'asc' } },
      accounts: { orderBy: { name: 'asc' } },
      recurring: {
        include: { category: true, account: true },
        orderBy: { nextDate: 'asc' },
      },
    },
  });

  if (!workspace) return <div className="p-8">Workspace non trovato.</div>;

  // Calcolo flussi mensili
  const monthlyIncomes = workspace.recurring
    .filter(i => i.isIncome && i.cadence === 'monthly')
    .reduce((s, i) => s + Number(i.amount), 0);
  const monthlyExpenses = workspace.recurring
    .filter(i => !i.isIncome && i.cadence === 'monthly')
    .reduce((s, i) => s + Number(i.amount), 0);

  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[var(--accent)] rounded-[2rem] shadow-[0_0_30px_var(--glow-accent)] text-[var(--accent-on)]">
            <RefreshCw size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[var(--fg-primary)] tracking-tight">Ricorrenze</h1>
            <p className="text-[var(--fg-muted)] font-medium">Gestisci abbonamenti e pagamenti pianificati</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="glass px-6 py-3 rounded-2xl border border-[var(--border-subtle)] text-right">
            <p className="text-[9px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">Flusso Mensile Netto</p>
            <p className="text-xl font-mono font-bold text-[var(--fg-primary)] mt-1">
              {fmt(monthlyIncomes - monthlyExpenses)}
            </p>
          </div>
        </div>
      </div>

      <RecurringManager
        items={workspace.recurring.map(i => ({ ...i, amount: Number(i.amount), account: i.account ? { ...i.account, openingBal: Number(i.account.openingBal) } : null })) as any}
        categories={workspace.categories}
        accounts={workspace.accounts.map(a => ({ ...a, openingBal: Number(a.openingBal) })) as any}
      />
    </div>
  );
}
