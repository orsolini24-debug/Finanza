'use client'

import ErrorFallback from '@/components/ui/ErrorFallback'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-black">
        <div className="min-h-screen flex items-center justify-center">
          <ErrorFallback error={error} reset={reset} />
        </div>
      </body>
    </html>
  )
}
