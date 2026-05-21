'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function OrgAdminError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900">Admin panel error</h2>
        <p className="max-w-sm text-gray-500">
          Something went wrong in this admin section. The issue has been logged.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" size="sm">
          Try again
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/calendar">Back to calendar</Link>
        </Button>
        <Button onClick={reportIssue} variant="ghost" size="sm">
          Report this issue
        </Button>
      </div>
    </div>
  )
}
