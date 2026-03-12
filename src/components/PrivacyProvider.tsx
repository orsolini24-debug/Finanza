'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface PrivacyContextType {
  isPrivate: boolean
  togglePrivacy: () => void
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined)

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('privacy_mode') === 'true'
    }
    return false
  })

  // Sincronizza preferenza nel localStorage quando cambia
  useEffect(() => {
    localStorage.setItem('privacy_mode', String(isPrivate))
  }, [isPrivate])

  const togglePrivacy = () => {
    setIsPrivate(prev => {
      const newValue = !prev
      localStorage.setItem('privacy_mode', String(newValue))
      return newValue
    })
  }

  // Scorciatoia da tastiera: Alt + H
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'h') {
        togglePrivacy()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider')
  }
  return context
}
