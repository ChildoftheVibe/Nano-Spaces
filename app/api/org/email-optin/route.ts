import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

const schema = z.object({ opted_in: z.boolean() })

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({ userMessage: 'Invalid input.', requestId })
  }

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id || profile.role !== 'org_admin') {
    throw new AuthError({ userMessage: 'Not authorized.', requestId })
  }

  await admin
    .from('organizations')
    .update({ master_admin_email_optin: parsed.data.opted_in })
    .eq('id', profile.org_id)

  return success({ updated: true })
})
