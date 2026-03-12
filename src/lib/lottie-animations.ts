/**
 * Lottie animation paths — file JSON in /public/animations/
 * Per aggiungere: copia il .json in public/animations/ e aggiungi il path qui.
 */
export const LOTTIE_ANIMATIONS = {
  // ── BATCH 1 ─────────────────────────────────────────────────────────
  /** Empty state generica (transazioni, goals, budget vuoti) */
  empty: '/animations/empty-state.json',

  /** Checkmark success (conferma azione) */
  success: '/animations/success.json',

  /** Cervello AI / loading AI Insights */
  aiBrain: '/animations/ai-brain.json',

  /** Salvadanaio / risparmio (Goals page) */
  piggyBank: '/animations/piggy-bank.json',

  /** Loading spinner (caricamento generico) */
  loading: '/animations/loading.json',

  // ── BATCH 2 ─────────────────────────────────────────────────────────
  /** Coriandoli / celebrazione (goal raggiunto al 100%) */
  confetti: '/animations/confetti.json',

  /** Grafico in crescita (Report / investimenti) */
  chartGrowing: '/animations/chart-growing.json',

  /** Attenzione / manutenzione / errore */
  warning: '/animations/warning.json',

  /** Portafoglio / conti */
  wallet: '/animations/wallet.json',

  /** Gattino — empty state divertente (pagina senza dati, onboarding) */
  catPlay: '/animations/cat-play.json',
} as const satisfies Record<string, string | null>

export type LottieAnimationKey = keyof typeof LOTTIE_ANIMATIONS
