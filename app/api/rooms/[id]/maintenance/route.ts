import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'
import { flagReservationsInWindow } from '@/lib/rooms/scanner'

const bodySchema = z.discriminatedUnion('enabled', [
  z.object({
    enabled: z.literal(true),
    maintenance_from: z.string().datetime(),
    maintenance_to: z.string().datetime(),
    maintenance_note: z.string().max(500).optional(),
  }),
  z.object({
    enabled: z.literal(false),
  }),
])

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
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid maintenance data.',
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

    let flagged = 0

    if (parsed.data.enabled) {
      const { maintenance_from, maintenance_to, maintenance_note } = parsed.data

      if (new Date(maintenance_to) <= new Date(maintenance_from)) {
        throw new ValidationError({
          userMessage: 'Maintenance end must be after start.',
          requestId,
        })
      }

      await admin
        .from('locations')
        .update({
          in_maintenance: true,
          maintenance_from,
          maintenance_to,
          maintenance_note: maintenance_note ?? null,
        })
        .eq('id', roomId)

      flagged = await flagReservationsInWindow(
        roomId,
        profile.org_id,
        new Date(maintenance_from),
        new Date(maintenance_to),
        `"${room.name as string}" is scheduled for maintenance during this time.`,
        room.name as string,
      )
    } else {
      await admin
        .from('locations')
        .update({
          in_maintenance: false,
          maintenance_from: null,
          maintenance_to: null,
          maintenance_note: null,
        })
        .eq('id', roomId)
    }

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: parsed.data.enabled ? 'room.maintenance_enabled' : 'room.maintenance_disabled',
      target_type: 'location',
      target_id: roomId,
      details: parsed.data.enabled
        ? { from: parsed.data.maintenance_from, to: parsed.data.maintenance_to, flagged }
        : {},
    })

    return success({ updated: true, flagged })
  },
)
