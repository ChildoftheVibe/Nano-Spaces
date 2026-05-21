'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  function reportIssue() {
    const eventId = Sentry.lastEventId()
    if (eventId) Sentry.showReportDialog({ eventId })
    else Sentry.showReportDialog()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="max-w-md text-gray-500">
          An unexpected error occurred. Our team has been notified. Please try again or contact
          support if the problem persists.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button onClick={reportIssue} variant="outline">
          Report this issue
        </Button>
      </div>
    </div>
  )
}
