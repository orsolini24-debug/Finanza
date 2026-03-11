'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wallet, ShieldCheck, Mail, Lock, User, Loader2, ArrowRight, CheckCircle } from 'lucide-react'
import { registerUser } from '@/app/actions/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setPasswordError('')

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setPasswordError('Le password non coincidono')
      return
    }

    setLoading(true)

    try {
      await registerUser(formData)

      // Auto-login dopo registrazione
      const result = await signIn('credentials', {
        login: formData.get('email') as string,
        password: formData.get('password') as string,
        redirect: false,
      })

      if (result?.error) {
        setError('Registrazione completata, effettua il login manualmente.')
        setStep('success')
      } else {
        router.push('/app/onboarding')
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="glass bg-[var(--bg-surface)]/40 p-10 rounded-[3rem] border border-[var(--border-default)] shadow-2xl max-w-md w-full text-center space-y-6">
          <CheckCircle className="mx-auto text-[var(--income)]" size={48} />
          <h2 className="text-2xl font-bold text-[var(--fg-primary)]">Account creato!</h2>
          <p className="text-[var(--fg-muted)]">{error}</p>
          <Link href="/auth/signin" className="block w-full bg-[var(--accent)] text-[var(--accent-on)] py-4 rounded-2xl font-bold text-center hover:shadow-[0_0_30px_var(--glow-accent)] transition-all">
            Vai al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />

      <div className="w-full max-w-md z-10 space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-[var(--accent)] rounded-[2rem] shadow-[0_0_30px_var(--glow-accent)] mb-4">
            <Wallet size={32} className="text-[var(--accent-on)]" />
          </div>
          <h1 className="text-5xl font-display font-black text-[var(--fg-primary)] tracking-tighter">
            Finance<span className="text-[var(--accent)]">.</span>
          </h1>
          <p className="text-[var(--fg-muted)] font-medium tracking-wide uppercase text-[10px]">
            Crea il tuo account gratuito
          </p>
        </div>

        <div className="glass bg-[var(--bg-surface)]/40 p-10 rounded-[3rem] border border-[var(--border-default)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Indirizzo Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)]" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="la-tua@email.it"
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium placeholder:text-[var(--fg-subtle)]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)]" />
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="mario_rossi"
                  pattern="[a-z0-9_]{3,20}"
                  title="3-20 caratteri: lettere minuscole, numeri, _"
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium placeholder:text-[var(--fg-subtle)]/50"
                />
              </div>
              <p className="text-[10px] text-[var(--fg-subtle)] ml-1">3-20 caratteri, solo lettere minuscole, numeri e _</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)]" />
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Minimo 6 caratteri"
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium placeholder:text-[var(--fg-subtle)]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Conferma Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)]" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="Ripeti la password"
                  className={`w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium placeholder:text-[var(--fg-subtle)]/50 ${passwordError ? 'border-[var(--expense)]' : 'border-[var(--border-default)]'}`}
                />
              </div>
              {passwordError && (
                <p className="text-[11px] text-[var(--expense)] font-bold ml-1">{passwordError}</p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-[var(--expense-dim)] border border-[var(--expense)]/20 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[var(--expense)] shrink-0" />
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
                  <span>Crea Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
            <p className="text-xs text-[var(--fg-muted)] font-medium">
              Hai già un account?{' '}
              <Link href="/auth/signin" className="text-[var(--accent)] font-bold hover:underline">
                Accedi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
