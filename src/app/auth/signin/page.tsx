'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wallet, ShieldCheck, AtSign, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function SignIn() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      login,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenziali non valide. Controlla email/username e password.')
    } else {
      router.push('/app/dashboard')
    }
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
            Dashboard Premium di Finanza Personale
          </p>
        </div>

        <div className="glass bg-[var(--bg-surface)]/40 p-10 rounded-[3rem] border border-[var(--border-default)] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Email o Username
              </label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)]" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  placeholder="email@example.com o username"
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium placeholder:text-[var(--fg-subtle)]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--fg-primary)] transition-all font-medium placeholder:text-[var(--fg-subtle)]/50"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-[var(--expense-dim)] border border-[var(--expense)]/20 rounded-2xl flex items-center gap-3 animate-shake">
                <ShieldCheck className="w-5 h-5 text-[var(--expense)]" />
                <p className="text-xs text-[var(--expense)] font-bold uppercase tracking-tight">{error}</p>
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
                  <span>Accedi alla Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center space-y-3">
            <p className="text-xs text-[var(--fg-muted)] font-medium">
              Non hai un account?{' '}
              <Link href="/auth/register" className="text-[var(--accent)] font-bold hover:underline">
                Registrati gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
