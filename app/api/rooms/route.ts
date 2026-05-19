import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError, TierLimitError } from '@/lib/errors/AppError'
import { checkRoomLimit } from '@/lib/tiers'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['room', 'building']),
  description: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
  max_booking_duration_mins: z.number().int().min(15).max(1440).optional(),
  max_bookings_per_user_per_day: z.number().int().min(1).max(99).optional(),
  min_notice_hours: z.number().int().min(0).max(168).optional(),
  cancel_notice_hours: z.number().int().min(0).max(168).optional(),
  max_advance_days: z.number().int().min(1).max(365).optional(),
  approval_required: z.boolean().optional(),
  nano_buffer_mins: z.number().int().min(0).max(60).optional(),
  ghost_buster_enabled: z.boolean().optional(),
  ghost_buster_mins: z.number().int().min(5).max(120).optional(),
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

  if (!profile || !profile.org_id) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }
  if (profile.role !== 'org_admin' && profile.role !== 'super_admin') {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()

  const [{ data: rooms }, { data: org }] = await Promise.all([
    admin
      .from('locations')
      .select(
        'id, name, type, description, notes, capacity, photo_url, is_active, in_maintenance, maintenance_from, maintenance_to, maintenance_note, max_booking_duration_mins, max_bookings_per_user_per_day, min_notice_hours, cancel_notice_hours, max_advance_days, approval_required, nano_buffer_mins, ghost_buster_enabled, ghost_buster_mins, created_at',
      )
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: true }),
    admin.from('organizations').select('tier_room_limit').eq('id', profile.org_id).single(),
  ])

  // Upcoming confirmed/pending bookings per room
  const roomIds = (rooms ?? []).map((r) => r.id)
  const { data: upcomingCounts } = roomIds.length
    ? await admin
        .from('reservations')
        .select('location_id')
        .in('location_id', roomIds)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString())
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const row of upcomingCounts ?? []) {
    const lid = row.location_id as string
    countMap[lid] = (countMap[lid] ?? 0) + 1
  }

  const roomsWithCounts = (rooms ?? []).map((r) => ({
    ...r,
    upcomingCount: countMap[r.id] ?? 0,
  }))

  const tierLimitReached =
    org?.tier_room_limit !== null &&
    org?.tier_room_limit !== undefined &&
    roomsWithCounts.filter((r) => r.is_active).length >= org.tier_room_limit

  return success({
    rooms: roomsWithCounts,
    tierLimitReached,
    roomLimit: org?.tier_room_limit ?? null,
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
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

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const tierCheck = await checkRoomLimit(profile.org_id)
  if (!tierCheck.allowed) {
    throw new TierLimitError({
      userMessage: `Room limit reached (${tierCheck.current}/${tierCheck.limit}). Upgrade your plan to add more rooms.`,
      requestId,
    })
  }

  const admin = createAdminClient()

  const insertData: Record<string, unknown> = {
    org_id: profile.org_id,
    ...parsed.data,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room, error: insertError } = await (admin.from('locations') as any)
    .insert(insertData)
    .select('id, name, type')
    .single()

  if (insertError || !room) {
    throw new Error('Failed to create room.')
  }

  await admin.from('activity_log').insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: 'room.created',
    target_type: 'location',
    target_id: room.id,
    details: { name: room.name, type: room.type },
  })

  return success({ room }, { status: 201 })
})
