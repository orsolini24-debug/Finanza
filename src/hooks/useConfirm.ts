'use client'
import { useState, useCallback } from 'react'

export function useConfirm() {
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const confirm = useCallback((msg: string): Promise<boolean> => {
    return new Promise(resolve => {
      setMessage(msg)
      setResolver(() => resolve)
      setOpen(true)
    })
  }, [])

  const handleConfirm = () => { setOpen(false); resolver?.(true) }
  const handleCancel  = () => { setOpen(false); resolver?.(false) }

  return { confirm, open, handleConfirm, handleCancel, message }
}
