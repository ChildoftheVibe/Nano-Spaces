import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

export const POST = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()

  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const adminClient = createAdminClient()

  // Get the latest active TOS version
  const { data: latestTos } = await adminClient
    .from('tos_versions')
    .select('version')
    .order('effective_at', { ascending: false })
    .limit(1)
    .single()

  await adminClient
    .from('profiles')
    .update({
      tos_accepted_at: new Date().toISOString(),
      tos_version_accepted: latestTos?.version ?? null,
    })
    .eq('id', user.id)

  return success({ accepted: true })
})
