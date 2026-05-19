import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

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

  if (!profile || !profile.org_id) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const admin = createAdminClient()

  const [{ data: org }, { count: roomCount }, { count: adminCount }, { count: userCount }] =
    await Promise.all([
      admin
        .from('organizations')
        .select(
          'id, display_name, subscription_status, subscription_tier, trial_starts_at, trial_ends_at, subscription_expires_at, grace_period_ends_at, paypal_subscription_id, tier_room_limit, tier_admin_limit, tier_user_limit',
        )
        .eq('id', profile.org_id)
        .single(),
      admin
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_active', true),
      admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('role', 'org_admin')
        .eq('is_active', true),
      admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_active', true),
    ])

  return success({
    org,
    role: profile.role,
    seatUsage: {
      rooms: { current: roomCount ?? 0, limit: org?.tier_room_limit ?? 5 },
      admins: { current: adminCount ?? 0, limit: org?.tier_admin_limit ?? 1 },
      users: { current: userCount ?? 0, limit: org?.tier_user_limit ?? null },
    },
  })
})
