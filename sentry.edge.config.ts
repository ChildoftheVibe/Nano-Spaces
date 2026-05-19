import * as Sentry from '@sentry/nextjs'

function scrubPii(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(scrubPii)
  const record = obj as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      key === 'email' || key === 'full_name' ? '[Filtered]' : scrubPii(value),
    ]),
  )
}

Sentry.init({
  ...(process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : {}),
  environment: process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.user) {
      const scrubbed = { ...event.user } as Record<string, unknown>
      delete scrubbed['email']
      delete scrubbed['full_name']
      event.user = scrubbed
    }
    if (event.request?.data) {
      event.request.data = scrubPii(event.request.data)
    }
    return event
  },
})
