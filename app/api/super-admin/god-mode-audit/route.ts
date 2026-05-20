import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw new AuthError({ userMessage: 'Super admin access required.', requestId })
  }

  const url = new URL(req.url)
  const orgId = url.searchParams.get('org_id') ?? ''
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = 100
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  let query = admin
    .from('activity_log')
    .select('id, org_id, actor_id, details, created_at', { count: 'exact' })
    .eq('action', 'reservation.god_mode_override')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (orgId) query = query.eq('org_id', orgId)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data: entries, count } = await query

  // Enrich with org names and admin names
  const orgIds = [...new Set((entries ?? []).map((e) => e.org_id).filter(Boolean))] as string[]
  const actorIds = [...new Set((entries ?? []).map((e) => e.actor_id).filter(Boolean))] as string[]

  const [{ data: orgs }, { data: adminProfiles }] = await Promise.all([
    orgIds.length
      ? admin.from('organizations').select('id, display_name').in('id', orgIds)
      : Promise.resolve({ data: [] }),
    actorIds.length
      ? admin.from('profiles').select('id, full_name').in('id', actorIds)
      : Promise.resolve({ data: [] }),
  ])

  const orgMap: Record<string, string> = {}
  for (const o of orgs ?? []) orgMap[o.id] = (o.display_name as string | null) ?? o.id

  const adminMap: Record<string, string> = {}
  for (const p of adminProfiles ?? []) adminMap[p.id] = (p.full_name as string | null) ?? 'Unknown'

  const enriched = (entries ?? []).map((e) => {
    const details = (e.details ?? {}) as Record<string, unknown>
    return {
      id: e.id,
      created_at: e.created_at,
      org_id: e.org_id,
      org_name: orgMap[e.org_id as string] ?? e.org_id,
      actor_id: e.actor_id,
      admin_name: e.actor_id ? (adminMap[e.actor_id as string] ?? 'Unknown') : 'Unknown',
      room_name: (details['room_name'] as string | null) ?? 'Unknown',
      title: (details['title'] as string | null) ?? 'Unknown',
      god_mode_reason: (details['god_mode_reason'] as string | null) ?? '',
      displaced_count: (details['displaced_count'] as number | null) ?? 0,
      start_time: (details['start_time'] as string | null) ?? '',
    }
  })

  // Fetch all orgs for filter dropdown
  const { data: allOrgs } = await admin
    .from('organizations')
    .select('id, display_name')
    .order('display_name')

  return success({ entries: enriched, total: count ?? 0, page, limit, orgs: allOrgs ?? [] })
})
