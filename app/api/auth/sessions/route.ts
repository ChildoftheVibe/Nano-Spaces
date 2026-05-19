import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient } from '@/lib/supabase/server'
import { clear2faCookieHeader } from '@/lib/auth/2fa-token'
import { AuthError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'

interface SupabaseSession {
  id: string
  created_at: string
  updated_at: string
  user_agent: string | null
  ip: string | null
  not_after: string | null
}

interface SessionsResponse {
  sessions: SupabaseSession[]
}

async function fetchSessions(userId: string): Promise<SupabaseSession[]> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/sessions`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  )
  if (!res.ok) return []
  const json = (await res.json()) as SessionsResponse
  return json.sessions ?? []
}

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()

  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const sessions = await fetchSessions(user.id)
  return success({ sessions })
})

export const DELETE = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()

  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  await sessionClient.auth.signOut({ scope: 'global' })

  return success({ revoked: true }, { headers: { 'Set-Cookie': clear2faCookieHeader() } })
})
