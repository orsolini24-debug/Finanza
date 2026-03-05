'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Wallet, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { completeOnboarding } from '@/app/actions/auth'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultName = (session?.user as any)?.name || ''

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      await completeOnboarding(formData)
      // Aggiorna sessione per riflettere isOnboarded = true
      await update({ isOnboarded: true })
      router.push('/app/dashboard')
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md z-10 space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-[var(--accent)] rounded-[2rem] shadow-[0_0_30px_var(--glow-accent)] mb-4 relative">
            <Wallet size={32} className="text-[var(--accent-on)]" />
            <div className="absolute -top-1 -right-1 p-1 bg-[var(--income)] rounded-full">
              <Sparkles size={12} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[var(--fg-primary)] tracking-tighter">
            Benvenuto! 👋
          </h1>
          <p className="text-[var(--fg-muted)] font-medium">
            Come vuoi essere chiamato nella dashboard?
          </p>
        </div>

        <div className="glass bg-[var(--bg-surface)]/40 p-10 rounded-[3rem] border border-[var(--border-default)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Il tuo nome visualizzato
              </label>
              <input
                type="text"
                name="displayName"
                defaultValue={defaultName}
                required
                minLength={2}
                maxLength={50}
                placeholder="Es. Mario Rossi"
                className="w-full px-5 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium text-lg placeholder:text-[var(--fg-subtle)]/50"
              />
              <p className="text-[10px] text-[var(--fg-subtle)] ml-1">
                Puoi modificarlo in qualsiasi momento dalle impostazioni
              </p>
            </div>

            {error && (
              <div className="p-4 bg-[var(--expense-dim)] border border-[var(--expense)]/20 rounded-2xl">
                <p className="text-xs text-[var(--expense)] font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-[var(--accent)] text-[var(--accent-on)] py-4 px-6 rounded-2xl font-bold text-sm transition-all duration-300 hover:shadow-[0_0_30px_var(--glow-accent)] hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Entra nella Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoading(true)
                const fd = new FormData()
                fd.set('displayName', defaultName || 'Utente')
                try {
                  await completeOnboarding(fd)
                  await update({ isOnboarded: true })
                  router.push('/app/dashboard')
                } catch {
                  setLoading(false)
                }
              }}
              className="w-full text-center text-xs text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-colors py-2"
            >
              Salta, continua con &quot;{defaultName || 'Utente'}&quot;
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
