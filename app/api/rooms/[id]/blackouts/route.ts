import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'
import { flagReservationsInWindow } from '@/lib/rooms/scanner'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  is_recurring: z.boolean().optional().default(false),
  recur_rule: z.string().max(200).optional(),
})

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string } }) => {
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

    const roomId = ctx.params?.id
    if (!roomId) throw new ValidationError({ userMessage: 'Missing room id.', requestId })

    const admin = createAdminClient()
    const { data: room } = await admin
      .from('locations')
      .select('id, org_id')
      .eq('id', roomId)
      .single()

    if (!room || room.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Room not found.', requestId })
    }

    const { data: blackouts } = await admin
      .from('blackout_dates')
      .select('*')
      .eq('location_id', roomId)
      .order('start_time', { ascending: true })

    return success({ blackouts: blackouts ?? [] })
  },
)

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
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

    const roomId = ctx.params?.id
    if (!roomId) throw new ValidationError({ userMessage: 'Missing room id.', requestId })

    const body = await req.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid blackout data.',
        requestId,
      })
    }

    if (new Date(parsed.data.end_time) <= new Date(parsed.data.start_time)) {
      throw new ValidationError({
        userMessage: 'End time must be after start time.',
        requestId,
      })
    }

    const admin = createAdminClient()
    const { data: room } = await admin
      .from('locations')
      .select('id, org_id, name')
      .eq('id', roomId)
      .single()

    if (!room || room.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Room not found.', requestId })
    }

    const { data: blackout, error: insertError } = await admin
      .from('blackout_dates')
      .insert({
        location_id: roomId,
        org_id: profile.org_id,
        title: parsed.data.title,
        start_time: parsed.data.start_time,
        end_time: parsed.data.end_time,
        is_recurring: parsed.data.is_recurring,
        recur_rule: parsed.data.recur_rule ?? null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertError || !blackout) throw new Error('Failed to create blackout.')

    // Flag reservations within the blackout window
    const flagged = await flagReservationsInWindow(
      roomId,
      profile.org_id,
      new Date(parsed.data.start_time),
      new Date(parsed.data.end_time),
      `A blackout period "${parsed.data.title}" has been added to this room.`,
      room.name as string,
    )

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'room.blackout_created',
      target_type: 'location',
      target_id: roomId,
      details: { blackoutId: blackout.id, title: parsed.data.title, flagged },
    })

    return success({ blackout, flagged }, { status: 201 })
  },
)
