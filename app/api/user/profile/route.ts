import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { updateProfileSchema } from '@/lib/validation/user'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, timezone, role, email_reminders, reminder_timing')
    .eq('id', user.id)
    .single()

  return success({ profile })
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient.from('profiles') as any)
    .update(parsed.data)
    .eq('id', user.id)

  if (updateError) {
    throw new AuthError({ userMessage: 'Failed to update profile.', requestId })
  }

  return success({ updated: true })
})
