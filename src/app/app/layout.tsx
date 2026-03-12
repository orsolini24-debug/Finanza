import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import PeriodPicker from "@/components/layout/PeriodPicker";
import { PageTransition } from "@/components/layout/PageTransition";
import { Suspense } from "react";
import { Toaster } from 'sonner'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg-base)]">
      <Suspense fallback={<div className="hidden md:block w-60 h-screen bg-[var(--bg-sidebar)]" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="h-14 md:h-16 border-b border-[var(--border-subtle)] flex items-center justify-between pl-16 pr-4 md:px-8 z-10 shrink-0"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            backdropFilter: 'blur(32px) saturate(160%)',
            WebkitBackdropFilter: 'blur(32px) saturate(160%)',
            background: 'color-mix(in srgb, var(--bg-base) 75%, transparent)',
            boxShadow: 'inset 0 -1px 0 var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-4" />
          <div className="flex items-center gap-3 md:gap-5">
            <Suspense fallback={<div className="h-9 w-36 md:w-48 bg-[var(--bg-elevated)] rounded-2xl skeleton" />}>
              <PeriodPicker />
            </Suspense>
            <div className="w-px h-5 bg-[var(--border-subtle)]" />
            <ThemeToggle />
          </div>
        </header>
        {/* Main content with page transitions */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <Toaster position="bottom-right" richColors theme="dark" />
    </div>
  );
}
