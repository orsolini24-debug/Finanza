import Sidebar from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import PeriodPicker from "@/components/layout/PeriodPicker";
import { Suspense } from "react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Suspense fallback={<div className="hidden md:block w-60 h-screen bg-[var(--bg-sidebar)] animate-pulse" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/50 backdrop-blur-md flex items-center justify-between pl-16 pr-4 md:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            {/* Slot per titoli o breadcrumb se necessario */}
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <Suspense fallback={<div className="h-9 w-36 md:w-48 bg-[var(--bg-elevated)] animate-pulse rounded-2xl" />}>
              <PeriodPicker />
            </Suspense>
            <div className="w-px h-6 bg-[var(--border-subtle)]" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
