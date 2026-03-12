'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function TransitionContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Usiamo sia pathname che searchParams come chiave per forzare la transizione 
  // e il re-mount del componente quando cambiano filtri o date.
  const key = `${pathname}?${searchParams.toString()}`

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.99 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TransitionContent>
        {children}
      </TransitionContent>
    </Suspense>
  )
}
