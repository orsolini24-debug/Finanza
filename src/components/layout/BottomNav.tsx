'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const BOTTOM_NAV_ITEMS = [
  { href: '/app/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/app/transactions', icon: ArrowLeftRight, label: 'Movimenti' },
  { href: '/app/budget', icon: Target, label: 'Budget' },
  { href: '/app/goals', icon: PiggyBank, label: 'Obiettivi' },
  { href: '/app/recurring', icon: MoreHorizontal, label: 'Altro' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const month = searchParams.get('month')

  const buildHref = (href: string) =>
    month ? `${href}?month=${month}` : href

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-sidebar)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1 pt-1 pb-1">
        {BOTTOM_NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={buildHref(href)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[56px] min-h-[48px] justify-center',
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--fg-muted)]'
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-2xl bg-[var(--accent)]/10" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className="relative z-10" />
              <span className={cn(
                'text-[9px] font-bold uppercase tracking-wide relative z-10',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--fg-subtle)]'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
