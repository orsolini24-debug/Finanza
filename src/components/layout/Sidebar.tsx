'use client'

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Wand2,
  Tags,
  Target,
  LogOut,
  Wallet,
  Landmark,
  PieChart,
  RefreshCw,
  LineChart,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import HelpPanel from "../help/HelpPanel";
import OnboardingTour from "../help/OnboardingTour";
import { Tooltip } from "../ui/Tooltip";

const navItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, tooltip: "Panoramica generale: patrimonio netto, KPI mensili, AI Insights e grafici cash flow" },
  { name: "Conti", href: "/app/accounts", icon: Landmark, tooltip: "Gestisci conti correnti, carte, risparmi, investimenti e debiti" },
  { name: "Budget", href: "/app/budget", icon: PieChart, tooltip: "Imposta limiti di spesa mensili per categoria e monitora quanto hai usato" },
  { name: "Ricorrenti", href: "/app/recurring", icon: RefreshCw, tooltip: "Pagamenti fissi e entrate periodiche (affitto, stipendio, abbonamenti…)" },
  { name: "Transazioni", href: "/app/transactions", icon: ArrowLeftRight, tooltip: "Storico completo dei movimenti: conferma, modifica o elimina transazioni" },
  { name: "Report", href: "/app/reports", icon: LineChart, tooltip: "Statistiche avanzate su 6 mesi: cash flow, categorie di spesa, confronti mensili" },
  { name: "Importa", href: "/app/import", icon: Upload, tooltip: "Importa movimenti da file CSV della tua banca con auto-categorizzazione" },
  { name: "Categorie", href: "/app/categories", icon: Tags, tooltip: "Crea e organizza le categorie di spesa (Alimentari, Trasporti, Svago…)" },
  { name: "Regole", href: "/app/rules", icon: Wand2, tooltip: "Regole automatiche per categorizzare le transazioni importate da CSV" },
  { name: "Obiettivi", href: "/app/goals", icon: Target, tooltip: "Definisci traguardi di risparmio e monitora i progressi verso ogni obiettivo" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Chiudi sidebar mobile al cambio route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const monthParam = searchParams.get('month');

  const sidebarContent = (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-[0_0_20px_var(--glow-accent)]">
          <Wallet className="text-[var(--accent-on)]" size={22} strokeWidth={2.5} />
        </div>
        <span className="font-display font-black text-xl tracking-tighter text-[var(--fg-primary)]">FINANZA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 custom-scrollbar overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href));
          const href = monthParam ? `${item.href}?month=${monthParam}` : item.href;
          
          const Icon = item.icon;
          return (
            <Tooltip key={item.href} content={item.tooltip} side="right" delay={300}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none",
                  isActive
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border-l-2 border-[var(--accent)]"
                    : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg-primary)]"
                )}
              >
                <Icon size={18} className={cn("transition-transform group-hover:scale-110 shrink-0", isActive && "text-[var(--accent)]")} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 space-y-1 border-t border-[var(--border-subtle)]">
        <button
          onClick={() => setShowHelp(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] rounded-xl transition-all duration-200 group"
        >
          <HelpCircle size={18} className="group-hover:scale-110 transition-transform shrink-0" />
          <span className="text-sm font-medium">Guida & Aiuto</span>
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 text-[var(--fg-muted)] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform shrink-0" />
          <span className="text-sm font-medium">Esci</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <HelpPanel
        open={showHelp}
        onClose={() => setShowHelp(false)}
        onStartTour={() => setShowTour(true)}
      />
      <OnboardingTour
        externalOpen={showTour}
        onExternalClose={() => setShowTour(false)}
      />

      {/* Hamburger button — visible only on mobile, inside header area */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-50 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-[var(--fg-primary)] shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Overlay backdrop (mobile) */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-[min(288px,85vw)] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] shadow-2xl transition-transform duration-300 ease-in-out",
        "md:static md:w-60 md:h-screen md:z-auto md:translate-x-0 md:flex md:flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))' }}>
        {sidebarContent}
      </div>
    </>
  );
}
