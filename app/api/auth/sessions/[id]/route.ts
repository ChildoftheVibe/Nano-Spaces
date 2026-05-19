import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient } from '@/lib/supabase/server'
import { clear2faCookieHeader } from '@/lib/auth/2fa-token'
import { AuthError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'

interface SupabaseSession {
  id: string
}

interface SessionsResponse {
  sessions: SupabaseSession[]
}

export const DELETE = withErrorHandling(async (_req: NextRequest, ctx) => {
  const requestId = crypto.randomUUID()
  const sessionId = (ctx.params as Record<string, string>)['id'] ?? ''

  if (!sessionId) {
    throw new AuthError({ userMessage: 'Session ID is required.', requestId })
  }

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()

  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  // Verify the session belongs to this user before revoking
  const listRes = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}/sessions`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  )
  const listJson = listRes.ok ? ((await listRes.json()) as SessionsResponse) : { sessions: [] }
  const owns = listJson.sessions.some((s) => s.id === sessionId)
  if (!owns) {
    throw new AuthError({ userMessage: 'Session not found.', requestId })
  }

  // Revoke the specific session via the Supabase Auth REST API
  await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}/sessions/${sessionId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  )

  // If the deleted session is the caller's own current session, clear the 2FA cookie
  const {
    data: { session: currentSession },
  } = await sessionClient.auth.getSession()
  const isCurrentSession = currentSession != null

  const headers: Record<string, string> = {}
  if (isCurrentSession) {
    headers['Set-Cookie'] = clear2faCookieHeader()
  }

  return success({ revoked: true }, { headers })
})
