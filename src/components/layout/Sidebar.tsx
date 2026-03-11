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
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import HelpPanel from "../help/HelpPanel";
import OnboardingTour from "../help/OnboardingTour";
import { Tooltip } from "../ui/Tooltip";
import { motion } from "framer-motion";
import { usePrivacy } from "../PrivacyProvider";

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
  const { isPrivate, togglePrivacy } = usePrivacy();

  // Chiudi sidebar mobile al cambio route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const monthParam = searchParams.get('month');

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0 py-6 px-4">
      {/* Brand Logo */}
      <div className="flex items-center gap-3.5 px-3 mb-12">
        <div className="w-11 h-11 bg-gradient-to-br from-[var(--accent)] to-[#0ec48e] rounded-[1.2rem] flex items-center justify-center shadow-[0_8px_20px_-4px_var(--glow-accent)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Wallet className="text-[var(--accent-on)] relative z-10" size={24} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-black text-xl tracking-[-0.04em] text-[var(--fg-primary)] leading-none">FINANZA</span>
          <span className="text-[9px] font-black text-[var(--accent)] uppercase tracking-[0.2em] mt-1 opacity-80">Premium PFOS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 space-y-1 custom-scrollbar overflow-y-auto pr-1 text-left">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href));
          const href = monthParam ? `${item.href}?month=${monthParam}` : item.href;
          
          const Icon = item.icon;
          return (
            <Tooltip key={item.href} content={item.tooltip} side="right" delay={400}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group w-full outline-none",
                  isActive
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(16,217,160,0.1)]"
                    : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg-primary)]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                  isActive ? "bg-[var(--accent)] text-[var(--accent-on)] shadow-lg" : "bg-transparent group-hover:bg-[var(--bg-surface)] group-hover:shadow-sm"
                )}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform", isActive ? "scale-100" : "group-hover:scale-110")} />
                </div>
                <span className={cn("text-[13px] font-bold tracking-tight transition-colors", isActive ? "text-[var(--fg-primary)]" : "text-[var(--fg-muted)] group-hover:text-[var(--fg-primary)]")}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--glow-accent)]"
                  />
                )}
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 space-y-1 border-t border-[var(--border-subtle)]">
        <button
          onClick={togglePrivacy}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group mb-1",
            isPrivate ? "bg-orange-500/10 text-orange-400" : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)]"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              isPrivate ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-transparent"
            )}>
              {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
            </div>
            <span className="text-[13px] font-bold tracking-tight">{isPrivate ? 'Ghost Mode' : 'Ghost Mode'}</span>
          </div>
          <div className={cn(
            "w-7 h-4 rounded-full relative transition-colors duration-300",
            isPrivate ? "bg-orange-500" : "bg-[var(--border-strong)]"
          )}>
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
              isPrivate ? "left-[14px]" : "left-0.5"
            )} />
          </div>
        </button>

        <button
          onClick={() => setShowHelp(true)}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] rounded-xl transition-all duration-200 group"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <HelpCircle size={18} className="group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <span className="text-[13px] font-bold tracking-tight">Guida & Aiuto</span>
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-[var(--fg-muted)] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 group"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform shrink-0" />
          </div>
          <span className="text-[13px] font-bold tracking-tight">Esci</span>
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
