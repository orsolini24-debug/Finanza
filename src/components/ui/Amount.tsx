'use client'

import { usePrivacy } from '../PrivacyProvider'
import { formatCurrency, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeOff } from 'lucide-react'

interface AmountProps {
  value: number | string
  className?: string
  showCurrency?: boolean
  prefix?: string
  hideLabel?: boolean
}

export function Amount({ value, className, prefix = '', hideLabel = false }: AmountProps) {
  const { isPrivate } = usePrivacy()
  const formatted = formatCurrency(value)

  return (
    <span className={cn("inline-flex items-center relative", className)}>
      <AnimatePresence mode="wait">
        {isPrivate ? (
          <motion.span
            key="private"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
             <span className="blur-[5px] select-none opacity-40 font-mono tracking-tighter">
                {formatted.replace(/[0-9]/g, '8')}
             </span>
             {!hideLabel && <EyeOff size={12} className="text-[var(--fg-subtle)] opacity-50 shrink-0" />}
          </motion.span>
        ) : (
          <motion.span
            key="public"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="tabular-nums"
          >
            {prefix}{formatted}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
