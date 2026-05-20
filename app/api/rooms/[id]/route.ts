import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  capacity: z.number().int().min(1).max(10000).nullable().optional(),
  max_booking_duration_mins: z.number().int().min(15).max(1440).nullable().optional(),
  max_bookings_per_user_per_day: z.number().int().min(1).max(99).nullable().optional(),
  min_notice_hours: z.number().int().min(0).max(168).optional(),
  cancel_notice_hours: z.number().int().min(0).max(168).optional(),
  max_advance_days: z.number().int().min(1).max(365).optional(),
  approval_required: z.boolean().optional(),
  nano_buffer_mins: z.number().int().min(0).max(60).optional(),
  ghost_buster_enabled: z.boolean().optional(),
  ghost_buster_mins: z.number().int().min(5).max(120).optional(),
  waitlist_enabled: z.boolean().optional(),
})

async function requireOrgAdminAndRoom(
  _req: NextRequest,
  ctx: { params?: { id?: string } },
  requestId: string,
) {
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

  const roomId = ctx.params?.id
  if (!roomId) throw new ValidationError({ userMessage: 'Missing room id.', requestId })

  const admin = createAdminClient()
  const { data: room } = await admin
    .from('locations')
    .select('id, org_id, name')
    .eq('id', roomId)
    .single()

  if (!room || room.org_id !== profile.org_id) {
    throw new NotFoundError({ userMessage: 'Room not found.', requestId })
  }

  return {
    user,
    profile: profile as { role: string; org_id: string },
    admin,
    room: room as { id: string; org_id: string; name: string },
  }
}

export const GET = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const { profile, admin } = await requireOrgAdminAndRoom(req, ctx, requestId)

    const roomId = ctx.params?.id ?? ''

    const [{ data: room }, { data: rules }, { data: blackouts }, { count: upcoming }] =
      await Promise.all([
        admin.from('locations').select('*').eq('id', roomId).eq('org_id', profile.org_id).single(),
        admin.from('availability_rules').select('*').eq('location_id', roomId),
        admin
          .from('blackout_dates')
          .select('*')
          .eq('location_id', roomId)
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true }),
        admin
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', roomId)
          .in('status', ['pending', 'confirmed'])
          .gte('start_time', new Date().toISOString()),
      ])

    if (!room) throw new NotFoundError({ userMessage: 'Room not found.', requestId })

    return success({
      room,
      rules: rules ?? [],
      blackouts: blackouts ?? [],
      upcomingCount: upcoming ?? 0,
    })
  },
)

export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const { user, profile, admin, room } = await requireOrgAdminAndRoom(req, ctx, requestId)

    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
        requestId,
      })
    }

    if (Object.keys(parsed.data).length === 0) {
      return success({ updated: false })
    }

    const updates: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updates[k] = v
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (admin.from('locations') as any)
      .update(updates)
      .eq('id', room.id)

    if (updateError) throw new Error('Failed to update room.')

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'room.updated',
      target_type: 'location',
      target_id: room.id,
      details: { fields: Object.keys(parsed.data) },
    })

    return success({ updated: true })
  },
)

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const { user, profile, admin, room } = await requireOrgAdminAndRoom(req, ctx, requestId)

    await admin.from('locations').update({ is_active: false }).eq('id', room.id)

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'room.deactivated',
      target_type: 'location',
      target_id: room.id,
      details: { name: room.name },
    })

    return success({ deleted: true })
  },
)
