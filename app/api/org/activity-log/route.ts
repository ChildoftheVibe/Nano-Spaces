import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

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
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    !['org_admin', 'super_admin'].includes(profile.role as string) ||
    !profile.org_id
  ) {
    throw new AuthError({ userMessage: 'Admin access required.', requestId })
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const action = url.searchParams.get('action') ?? ''
  const actor = url.searchParams.get('actor') ?? ''
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  const limit = 50
  const offset = (page - 1) * limit

  if (page > 1000) throw new ValidationError({ userMessage: 'Invalid page.', requestId })

  const admin = createAdminClient()

  let query = admin
    .from('activity_log')
    .select('id, action, actor_id, target_type, target_id, details, created_at', {
      count: 'exact',
    })
    .eq('org_id', profile.org_id as string)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.ilike('action', `%${action}%`)
  if (actor) query = query.eq('actor_id', actor)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data: entries, count } = await query

  // Enrich with actor names
  const actorIds = [...new Set((entries ?? []).map((e) => e.actor_id).filter(Boolean))] as string[]
  const { data: actorProfiles } = actorIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] }

  const nameMap: Record<string, string> = {}
  for (const p of actorProfiles ?? []) {
    nameMap[p.id] = (p.full_name as string | null) ?? 'Unknown'
  }

  const enriched = (entries ?? []).map((e) => ({
    ...e,
    actor_name: e.actor_id ? (nameMap[e.actor_id as string] ?? 'Unknown') : 'System',
  }))

  return success({ entries: enriched, total: count ?? 0, page, limit })
})
