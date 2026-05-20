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
  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const orgFilter = url.searchParams.get('org_id') ?? ''

  if (!q || q.length < 2) {
    return success({ reservations: [], rooms: [], users: [] })
  }
  if (q.length > 100) {
    throw new ValidationError({ userMessage: 'Query too long.', requestId })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new AuthError({ userMessage: 'Profile not found.', requestId })
  }

  const isSuperAdmin = profile.role === 'super_admin'
  const isOrgAdmin = profile.role === 'org_admin' || isSuperAdmin
  const orgId = (profile.org_id as string | null) ?? ''

  const tsQuery = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, '') + ':*')
    .join(' & ')

  if (!tsQuery) return success({ reservations: [], rooms: [], users: [] })

  // ── Reservations ──────────────────────────────────────────────────────────
  let resQuery = admin
    .from('reservations')
    .select('id, title, notes, start_time, end_time, status, location_id, booked_by, org_id')
    .textSearch('title_fts', tsQuery, { type: 'websearch' })
    .neq('status', 'cancelled')
    .order('start_time', { ascending: false })
    .limit(8)

  if (isSuperAdmin) {
    if (orgFilter) resQuery = resQuery.eq('org_id', orgFilter)
  } else {
    if (orgId) resQuery = resQuery.eq('org_id', orgId)
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  let roomQuery = admin
    .from('locations')
    .select('id, name, description, capacity, is_active, in_maintenance, org_id')
    .textSearch('name_fts', tsQuery, { type: 'websearch' })
    .order('name')
    .limit(6)

  if (isSuperAdmin) {
    if (orgFilter) roomQuery = roomQuery.eq('org_id', orgFilter)
  } else {
    if (orgId) roomQuery = roomQuery.eq('org_id', orgId)
  }

  // ── Users (org_admin + super_admin only) ──────────────────────────────────
  let userResults: {
    id: string
    full_name: string | null
    email: string | null
    role: string
    org_id: string | null
  }[] = []

  if (isOrgAdmin) {
    let userQuery = admin
      .from('profiles')
      .select('id, full_name, role, org_id')
      .textSearch('full_name_fts', tsQuery, { type: 'websearch' })
      .order('full_name')
      .limit(6)

    if (isSuperAdmin) {
      if (orgFilter) userQuery = userQuery.eq('org_id', orgFilter)
    } else {
      if (orgId) userQuery = userQuery.eq('org_id', orgId)
    }

    const { data: rawUsers } = await userQuery
    const profileIds = (rawUsers ?? []).map((p) => p.id)

    if (profileIds.length > 0) {
      const { data: authUsers } = await admin.auth.admin.listUsers()
      const emailMap = new Map(authUsers.users.map((u) => [u.id, u.email ?? null]))
      userResults = (rawUsers ?? []).map((p) => ({
        id: p.id,
        full_name: (p.full_name as string | null) ?? null,
        role: p.role as string,
        org_id: (p.org_id as string | null) ?? null,
        email: emailMap.get(p.id) ?? null,
      }))
    }
  }

  const [resResult, roomResult] = await Promise.all([resQuery, roomQuery])

  // Enrich reservations with room name
  const locationIds = [...new Set((resResult.data ?? []).map((r) => r.location_id as string))]
  let locationMap: Record<string, string> = {}
  if (locationIds.length > 0) {
    const { data: locs } = await admin.from('locations').select('id, name').in('id', locationIds)
    locationMap = Object.fromEntries((locs ?? []).map((l) => [l.id as string, l.name as string]))
  }

  const reservations = (resResult.data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    notes: (r.notes as string | null) ?? null,
    start_time: r.start_time as string,
    end_time: r.end_time as string,
    status: r.status as string,
    location_id: r.location_id as string,
    org_id: r.org_id as string,
    room_name: locationMap[r.location_id as string] ?? null,
  }))

  const rooms = (roomResult.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    capacity: (r.capacity as number | null) ?? null,
    is_active: r.is_active as boolean,
    in_maintenance: r.in_maintenance as boolean,
    org_id: r.org_id as string,
  }))

  // Super admin: fetch org names for display
  let orgMap: Record<string, string> = {}
  if (isSuperAdmin) {
    const orgIds = [
      ...new Set(
        [
          ...reservations.map((r) => r.org_id),
          ...rooms.map((r) => r.org_id),
          ...userResults.map((u) => u.org_id),
        ].filter((id): id is string => Boolean(id)),
      ),
    ]
    if (orgIds.length > 0) {
      const { data: orgs } = await admin
        .from('organizations')
        .select('id, display_name')
        .in('id', orgIds)
      orgMap = Object.fromEntries(
        (orgs ?? []).map((o) => [o.id as string, o.display_name as string]),
      )
    }
  }

  return success({
    reservations: reservations.map((r) => ({ ...r, org_name: orgMap[r.org_id] ?? null })),
    rooms: rooms.map((r) => ({
      ...r,
      status: r.in_maintenance ? 'maintenance' : r.is_active ? 'active' : 'inactive',
      org_name: orgMap[r.org_id] ?? null,
    })),
    users: userResults.map((u) => ({
      ...u,
      org_name: orgMap[u.org_id ?? ''] ?? null,
    })),
  })
})
