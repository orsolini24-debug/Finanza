import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import BudgetManager from "@/components/budget/BudgetManager";
import { getCurrentMonth, formatMonthLabel } from "@/lib/period";
import { getBudgetsWithSpending } from "@/app/actions/budgets";
import { PieChart } from "lucide-react";

export default async function BudgetPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const resolvedSearchParams = await searchParams;
  const month = (resolvedSearchParams.month as string) || getCurrentMonth();
  
  const userId = (session.user as any).id;
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: { categories: { orderBy: { name: 'asc' } } }
  });

  if (!workspace) return <div className="p-8">Workspace non trovato.</div>;

  const budgetData = await getBudgetsWithSpending(workspace.id, month);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[var(--accent)] rounded-[2rem] shadow-[0_0_30px_var(--glow-accent)] text-[var(--accent-on)]">
            <PieChart size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[var(--fg-primary)] tracking-tight">Budget</h1>
            <p className="text-[var(--fg-muted)] font-medium">
              Monitoraggio spese per {formatMonthLabel(month)}
            </p>
          </div>
        </div>
      </div>

      <BudgetManager 
        budgetData={budgetData} 
        categories={workspace.categories} 
        month={month} 
      />
    </div>
  );
}
