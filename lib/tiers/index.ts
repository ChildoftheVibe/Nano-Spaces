import { createAdminClient } from '@/lib/supabase/server'

export interface TierCheckResult {
  allowed: boolean
  current: number
  limit: number | null
}

export async function checkRoomLimit(orgId: string): Promise<TierCheckResult> {
  const admin = createAdminClient()

  const [{ data: org }, { count }] = await Promise.all([
    admin.from('organizations').select('tier_room_limit').eq('id', orgId).single(),
    admin
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_active', true),
  ])

  const limit = org?.tier_room_limit ?? null
  const current = count ?? 0
  return { allowed: limit === null || current < limit, current, limit }
}

export async function checkAdminLimit(orgId: string): Promise<TierCheckResult> {
  const admin = createAdminClient()

  const [{ data: org }, { count }] = await Promise.all([
    admin.from('organizations').select('tier_admin_limit').eq('id', orgId).single(),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'org_admin')
      .eq('is_active', true),
  ])

  const limit = org?.tier_admin_limit ?? null
  const current = count ?? 0
  return { allowed: limit === null || current < limit, current, limit }
}

export async function checkUserLimit(orgId: string): Promise<TierCheckResult> {
  const admin = createAdminClient()

  const [{ data: org }, { count }] = await Promise.all([
    admin.from('organizations').select('tier_user_limit').eq('id', orgId).single(),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_active', true),
  ])

  const limit = org?.tier_user_limit ?? null
  const current = count ?? 0
  return { allowed: limit === null || current < limit, current, limit }
}
