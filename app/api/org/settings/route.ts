import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  primary_timezone: z.string().min(1).max(100).optional(),
  email_signature: z.string().max(500).nullable().optional(),
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
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
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()
  const updates: Record<string, unknown> = {}

  if (parsed.data.display_name !== undefined) updates.display_name = parsed.data.display_name
  if (parsed.data.primary_timezone !== undefined)
    updates.primary_timezone = parsed.data.primary_timezone
  if (parsed.data.email_signature !== undefined)
    updates.email_signature = parsed.data.email_signature

  if (Object.keys(updates).length === 0) {
    return success({ updated: false })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin.from('organizations') as any)
    .update(updates)
    .eq('id', profile.org_id)

  if (updateError) {
    throw new Error('Failed to update org settings.')
  }

  await admin.from('activity_log').insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: 'org_settings_updated',
    target_type: 'organization',
    target_id: profile.org_id,
    details: { fields: Object.keys(updates) },
  })

  return success({ updated: true })
})

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select(
      'id, display_name, name, slug, logo_url, primary_timezone, email_signature, subscription_tier, subscription_status, tier_room_limit, tier_admin_limit, tier_user_limit',
    )
    .eq('id', profile.org_id)
    .single()

  return success({ org })
})
