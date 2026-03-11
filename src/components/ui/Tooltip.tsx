'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, side = 'top', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateCoords = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    
    let top = 0
    let left = 0

    if (side === 'right') {
      top = rect.top + rect.height / 2
      left = rect.right + 12
    } else if (side === 'top') {
      top = rect.top - 12
      left = rect.left + rect.width / 2
    } else if (side === 'bottom') {
      top = rect.bottom + 12
      left = rect.left + rect.width / 2
    } else if (side === 'left') {
      top = rect.top + rect.height / 2
      left = rect.left - 12
    }

    setCoords({ top, left })
  }

  const show = () => {
    // Evita tooltip su dispositivi touch se non esplicitamente richiesto
    if (window.matchMedia('(pointer: coarse)').matches) return
    
    updateCoords()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  const tooltipVariants = {
    hidden: { opacity: 0, scale: 0.9, x: side === 'right' ? -8 : 0, y: side === 'top' ? 8 : (side === 'bottom' ? -8 : 0) },
    visible: { opacity: 1, scale: 1, x: 0, y: 0 },
  }

  const translateClasses = {
    right: '-translate-y-1/2',
    left: '-translate-y-1/2 -translate-x-full',
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
  }

  return (
    <span 
      className="inline-flex items-center justify-center" 
      onMouseEnter={show} 
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      ref={triggerRef}
    >
      {children}
      {mounted && createPortal(
        <AnimatePresence>
          {visible && content && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={tooltipVariants}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 10000, // Z-index ultra elevato
                pointerEvents: 'none'
              }}
              className={cn(
                'px-4 py-2.5 rounded-[1.2rem] text-[11px] leading-relaxed font-bold tracking-tight',
                'bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-[var(--fg-primary)]',
                'max-w-[280px] w-max whitespace-normal backdrop-blur-xl',
                translateClasses[side]
              )}
            >
              {/* Subtle accent light */}
              <div className="absolute inset-0 rounded-[1.2rem] bg-gradient-to-br from-white/5 to-transparent pointer-none" />
              <div className="relative z-10">{content}</div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  )
}
