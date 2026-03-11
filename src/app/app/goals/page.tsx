import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import GoalsManager from "@/components/goals/GoalsManager";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: (session.user as any).id } } },
    include: {
      goals: { orderBy: { priority: 'asc' } },
      accounts: { orderBy: { name: 'asc' } }
    },
  });

  if (!workspace) return <div className="p-8">Nessun workspace trovato. Contatta l'assistenza.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[var(--fg-primary)] tracking-tight">
            Obiettivi Finanziari
          </h1>
          <p className="text-[var(--fg-muted)] mt-2 font-medium">
            Imposta e monitora i tuoi obiettivi finanziari a lungo termine.
          </p>
        </div>
      </div>
      
      <GoalsManager
        goals={workspace.goals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) })) as any}
        accounts={workspace.accounts.map(a => ({ ...a, openingBal: Number(a.openingBal) })) as any}
      />
    </div>
  );
}
