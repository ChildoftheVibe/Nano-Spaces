import * as Sentry from '@sentry/nextjs'
import { env } from '@/lib/env'
import { ExternalServiceError } from '@/lib/errors/AppError'

const FROM = 'Nano Spaces <noreply@nanospaces.app>'
const RESEND_URL = 'https://api.resend.com/emails'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  requestId?: string
}

export async function sendEmail({ to, subject, html, requestId }: SendEmailParams): Promise<void> {
  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const error = new ExternalServiceError({
      userMessage: 'Failed to send email. Please try again later.',
      details: { status: response.status, body },
      requestId: requestId ?? crypto.randomUUID(),
    })
    Sentry.captureException(error, { extra: { to: '[redacted]', subject } })
    throw error
  }
}
