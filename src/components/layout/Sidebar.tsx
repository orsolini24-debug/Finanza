'use client'

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Zap,
  Tag,
  Target,
  LogOut,
  Wallet,
  Landmark,
  PieChart,
  RefreshCw,
  BarChart3,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import HelpPanel from "@/components/help/HelpPanel";
import OnboardingTour from "@/components/help/OnboardingTour";

const navItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Conti", href: "/app/accounts", icon: Wallet },
  { name: "Budget", href: "/app/budget", icon: PieChart },
  { name: "Ricorrenti", href: "/app/recurring", icon: RefreshCw },
  { name: "Transazioni", href: "/app/transactions", icon: ArrowLeftRight },
  { name: "Report", href: "/app/reports", icon: BarChart3 },
  { name: "Importa", href: "/app/import", icon: Upload },
  { name: "Categorie", href: "/app/categories", icon: Tag },
  { name: "Regole", href: "/app/rules", icon: Zap },
  { name: "Obiettivi", href: "/app/goals", icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const month = searchParams.get('month');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Chiudi sidebar al cambio di route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Blocca scroll body quando aperto su mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[var(--accent)] rounded-lg shadow-[0_0_15px_var(--glow-accent)]">
              <Landmark size={20} className="text-[var(--accent-on)]" />
            </div>
            <h1 className="text-xl font-display font-bold text-[var(--fg-primary)] tracking-tight">
              Finance
            </h1>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--fg-subtle)] ml-11">
            Personale
          </p>
        </div>
        {/* Close button mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-2 rounded-xl text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const href = month ? `${item.href}?month=${month}` : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-[var(--accent-dim)] text-[var(--accent)] border-l-2 border-[var(--accent)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg-primary)]"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-transform duration-200 shrink-0",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-[var(--border-subtle)] space-y-1">
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
        className="md:hidden fixed top-3.5 left-4 z-40 p-2.5 bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-xl shadow-md text-[var(--fg-primary)] transition-all active:scale-95"
        aria-label="Apri menu"
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
        // Mobile: fixed drawer sliding from left
        "fixed inset-y-0 left-0 z-50 w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] transition-transform duration-300 ease-in-out",
        // Desktop: static in the flex layout
        "md:static md:w-60 md:h-screen md:z-auto md:translate-x-0 md:flex md:flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>
    </>
  );
}
