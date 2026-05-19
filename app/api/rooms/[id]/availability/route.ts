import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'
import { flagReservationsOutsideAvailability } from '@/lib/rooms/scanner'

const ruleSchema = z.object({
  day_of_week: z.array(z.number().int().min(0).max(6)).min(1),
  open_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  close_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  block_holidays: z.boolean().optional().default(false),
})

const putSchema = z.object({
  rules: z.array(ruleSchema),
})

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

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

    const { data: rules } = await admin
      .from('availability_rules')
      .select('*')
      .eq('location_id', roomId)

    return success({ rules: rules ?? [] })
  },
)

export const PUT = withErrorHandling(
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
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid rules.',
        details: parsed.error.flatten(),
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

    // Normalize times to HH:MM:SS
    const newRules = parsed.data.rules.map((r) => ({
      location_id: roomId,
      day_of_week: r.day_of_week,
      open_time: normalizeTime(r.open_time),
      close_time: normalizeTime(r.close_time),
      block_holidays: r.block_holidays,
    }))

    // Replace all rules atomically
    await admin.from('availability_rules').delete().eq('location_id', roomId)

    if (newRules.length > 0) {
      const { error: insertError } = await admin.from('availability_rules').insert(newRules)
      if (insertError) throw new Error('Failed to save availability rules.')
    }

    // Retroactive scan — flag reservations no longer within valid windows
    const flagged = await flagReservationsOutsideAvailability(
      roomId,
      profile.org_id,
      newRules,
      room.name as string,
    )

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'room.availability_updated',
      target_type: 'location',
      target_id: roomId,
      details: { ruleCount: newRules.length, flagged },
    })

    return success({ saved: true, flagged })
  },
)
