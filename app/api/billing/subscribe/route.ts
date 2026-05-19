import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'
import { createSubscription } from '@/lib/paypal/client'
import { env } from '@/lib/env'

const bodySchema = z.object({
  tier: z.enum(['starter', 'growth']),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({ userMessage: 'Invalid tier selection.', requestId })
  }

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

  const planId =
    parsed.data.tier === 'growth' ? env.PAYPAL_GROWTH_PLAN_ID : env.PAYPAL_STARTER_PLAN_ID

  const base = env.NEXT_PUBLIC_APP_URL
  const result = await createSubscription(
    planId,
    profile.org_id,
    `${base}/settings/billing?status=success`,
    `${base}/settings/billing?status=cancelled`,
  )

  return success({ approvalUrl: result.approvalUrl, subscriptionId: result.subscriptionId })
})
