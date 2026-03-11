'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, side = 'top', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!content) return <>{children}</>

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-[500] pointer-events-none w-max max-w-[220px]',
            'px-3 py-2 rounded-xl text-[11px] leading-relaxed font-medium text-center',
            'bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-2xl text-[var(--fg-primary)]',
            'animate-in fade-in zoom-in-95 duration-150',
            side === 'top' && 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
            side === 'bottom' && 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
            side === 'left' && 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
            side === 'right' && 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
