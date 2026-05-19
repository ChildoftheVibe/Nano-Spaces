import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient } from '@/lib/supabase/server'
import { clear2faCookieHeader } from '@/lib/auth/2fa-token'

export const POST = withErrorHandling(async (_req: NextRequest) => {
  const sessionClient = await createSessionClient()
  await sessionClient.auth.signOut()

  return success({ loggedOut: true }, { headers: { 'Set-Cookie': clear2faCookieHeader() } })
})
