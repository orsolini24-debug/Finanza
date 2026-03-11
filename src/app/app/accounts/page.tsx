import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AccountsManager from "@/components/accounts/AccountsManager";
import { Wallet, Landmark } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const userId = (session.user as any).id;
  
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      accounts: true
    }
  });

  if (!workspace) return <div className="p-8">Nessun workspace trovato. Contatta l'assistenza.</div>;

  // Calcolo dei saldi per ogni account
  const accountsWithBalances = await Promise.all(workspace.accounts.map(async (acc) => {
    const aggregate = await prisma.transaction.aggregate({
      where: {
        accountId: acc.id,
        // Problem #14 - Include STAGED in balance calculation for accuracy
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

  const totalNetWorth = accountsWithBalances.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[var(--accent)] rounded-[2rem] shadow-[0_0_30px_var(--glow-accent)]">
            <Wallet size={32} className="text-[var(--accent-on)]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[var(--fg-primary)] tracking-tight">I tuoi Conti</h1>
            <p className="text-[var(--fg-muted)] font-medium">Gestione conti correnti, carte e risparmi</p>
          </div>
        </div>

        <div className="glass px-8 py-4 rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/10 flex flex-col items-end">
          <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-[0.2em] mb-1">Patrimonio Netto Totale</p>
          <p className={cn(
            "text-3xl font-mono font-black tracking-tighter",
            totalNetWorth >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
          )}>
            {formatCurrency(totalNetWorth)}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-2xl text-[11px] text-[var(--fg-muted)] leading-relaxed">
        <span className="shrink-0 mt-0.5">💡</span>
        <span>
          Il <span className="font-bold text-[var(--fg-primary)]">tipo di conto</span> determina dove appare nel patrimonio:
          <span className="text-blue-400 font-bold"> Corrente/Contanti</span> → Liquidità ·
          <span className="text-[var(--income)] font-bold"> Deposito</span> → Risparmi ·
          <span className="text-purple-400 font-bold"> Investimento</span> → Investimenti ·
          <span className="text-[var(--expense)] font-bold"> Prestito/Mutuo</span> → Debiti
        </span>
      </div>

      {accountsWithBalances.length === 0 ? (
        <div className="glass p-20 rounded-[3rem] border border-dashed border-[var(--border-default)] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-6">
            <Landmark size={40} className="text-[var(--fg-subtle)] opacity-50" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[var(--fg-primary)] mb-2">Nessun conto configurato</h2>
          <p className="text-[var(--fg-muted)] max-w-sm mb-8 font-medium">Inizia creando il tuo primo conto per poter registrare transazioni e monitorare le tue finanze.</p>
          <AccountsManager accounts={[]} openModalByDefault={true} />
        </div>
      ) : (
        <AccountsManager accounts={accountsWithBalances as any} />
      )}
    </div>
  );
}
