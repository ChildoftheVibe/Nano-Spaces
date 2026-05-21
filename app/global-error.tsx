'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Catches crashes in the root layout itself — needs its own <html> shell
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1.5rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111' }}>
            Nano Spaces is temporarily unavailable
          </h1>
          <p style={{ maxWidth: '28rem', color: '#6b7280' }}>
            A critical error occurred. Our team has been notified. Please refresh the page or try
            again in a moment.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9ca3af' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#4F7EFA',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Refresh page
          </button>
        </div>
      </body>
    </html>
  )
}
