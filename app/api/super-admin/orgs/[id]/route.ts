import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

const patchSchema = z.object({
  action: z.enum(['extend_trial']),
  days: z.number().int().min(1).max(90).optional(),
})

export const PATCH = withErrorHandling(
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
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new AuthError({ userMessage: 'Super admin access required.', requestId })
    }

    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
        requestId,
      })
    }

    const orgId = ctx.params?.id
    if (!orgId) throw new ValidationError({ userMessage: 'Missing org id.', requestId })

    const admin = createAdminClient()
    const { data: org } = await admin
      .from('organizations')
      .select('id, subscription_status, trial_ends_at')
      .eq('id', orgId)
      .single()

    if (!org) throw new NotFoundError({ userMessage: 'Organization not found.', requestId })

    if (parsed.data.action === 'extend_trial') {
      const extraDays = parsed.data.days ?? 7
      const currentEnd =
        org.subscription_status === 'trial' && org.trial_ends_at
          ? new Date(org.trial_ends_at)
          : new Date()
      const newEnd = new Date(
        Math.max(currentEnd.getTime(), Date.now()) + extraDays * 24 * 60 * 60 * 1000,
      )

      await admin
        .from('organizations')
        .update({
          trial_ends_at: newEnd.toISOString(),
          subscription_status: 'trial',
        })
        .eq('id', org.id)

      await admin.from('activity_log').insert({
        org_id: org.id,
        actor_id: user.id,
        action: 'trial_extended',
        target_type: 'organization',
        target_id: org.id,
        details: { extra_days: extraDays, new_trial_end: newEnd.toISOString() },
      })

      return success({ newTrialEnd: newEnd.toISOString() })
    }

    throw new ValidationError({ userMessage: 'Unknown action.', requestId })
  },
)
