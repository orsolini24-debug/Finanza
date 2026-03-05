import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import RulesManager from "@/components/rules/RulesManager";

export default async function RulesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: (session.user as any).id } } },
    include: {
      rules: {
        include: { category: true },
        orderBy: { priority: 'asc' },
      },
      categories: { orderBy: { name: 'asc' } },
    },
  });

  if (!workspace) return <div className="p-8">Workspace non trovato.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[var(--fg-primary)] tracking-tight">
            Regole Intelligenti
          </h1>
          <p className="text-[var(--fg-muted)] mt-2 font-medium">
            Automatizza la categorizzazione in base ai pattern delle transazioni.
          </p>
        </div>
      </div>
      
      <RulesManager rules={workspace.rules} categories={workspace.categories} />    
    </div>
  );
}
