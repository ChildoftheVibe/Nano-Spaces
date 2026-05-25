import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

async function requireSuperAdmin(requestId: string) {
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

  return { user }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['room', 'building']),
  capacity: z.number().int().min(1).max(10000).optional(),
  description: z.string().max(500).optional(),
})

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const { user } = await requireSuperAdmin(requestId)

    const orgId = ctx.params?.id
    if (!orgId) throw new ValidationError({ userMessage: 'Missing org id.', requestId })

    const body = await req.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
        requestId,
      })
    }

    const admin = createAdminClient()

    const { data: org } = await admin.from('organizations').select('id').eq('id', orgId).single()
    if (!org) throw new NotFoundError({ userMessage: 'Organization not found.', requestId })

    const { data: room, error: insertError } = await admin
      .from('locations')
      .insert({
        org_id: orgId,
        name: parsed.data.name,
        type: parsed.data.type,
        capacity: parsed.data.capacity ?? null,
        description: parsed.data.description ?? null,
      })
      .select('id')
      .single()

    if (insertError ?? !room) throw new Error('Failed to create room.')

    await admin.from('activity_log').insert({
      org_id: orgId,
      actor_id: user.id,
      action: 'room_added_by_super_admin',
      target_type: 'location',
      target_id: room.id,
      details: { name: parsed.data.name },
    })

    return success({ roomId: room.id })
  },
)
