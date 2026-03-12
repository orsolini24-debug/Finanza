'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, MoreHorizontal, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const BOTTOM_NAV_ITEMS = [
  { href: '/app/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/app/transactions', icon: ArrowLeftRight, label: 'Movimenti' },
  { href: '/app/simulator', icon: TrendingUp, label: 'Simula' },
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-subtle)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        background: 'color-mix(in srgb, var(--bg-sidebar) 92%, transparent)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-1.5 pb-1.5">
        {BOTTOM_NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={buildHref(href)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-colors duration-200 min-w-[60px] min-h-[52px] justify-center',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'
              )}
            >
              {/* Active background pill */}
              {isActive && (
                <motion.span
                  layoutId="bottom-active-bg"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: 'var(--accent-dim)' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                />
              )}
              {/* Active glow dot */}
              {isActive && (
                <motion.span
                  layoutId="bottom-active-dot"
                  className="absolute top-1.5 w-3.5 h-0.5 rounded-full bg-[var(--accent)]"
                  style={{ boxShadow: '0 0 8px var(--glow-accent)' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="relative z-10 transition-transform duration-200"
                style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
              />
              <span className={cn(
                'text-[9px] font-black uppercase tracking-wide relative z-10 transition-colors duration-200',
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
