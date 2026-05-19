import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError } from '@/lib/errors/AppError'
import { cancelSubscription } from '@/lib/paypal/client'
import { sendEmail } from '@/lib/email/send'
import { gracePeriodTemplate } from '@/lib/email/auth-templates'
import { env } from '@/lib/env'

export const POST = withErrorHandling(async (_req: NextRequest) => {
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

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('id, paypal_subscription_id, subscription_status')
    .eq('id', profile.org_id)
    .single()

  if (!org) throw new NotFoundError({ userMessage: 'Organization not found.', requestId })

  if (org.paypal_subscription_id) {
    await cancelSubscription(org.paypal_subscription_id, 'Cancelled by org admin').catch(() => null)
  }

  const graceEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

  await admin
    .from('organizations')
    .update({ subscription_status: 'grace', grace_period_ends_at: graceEndsAt })
    .eq('id', org.id)

  await admin.from('activity_log').insert({
    org_id: org.id,
    actor_id: user.id,
    action: 'subscription_cancelled',
    target_type: 'organization',
    target_id: org.id,
    details: { grace_ends_at: graceEndsAt, initiated_by: 'org_admin' },
  })

  // Notify the org admin of grace period start
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('org_id', org.id)
    .eq('role', 'org_admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (adminProfile) {
    const graceEndsFormatted = new Date(graceEndsAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    await sendEmail({
      to: adminProfile.email as string,
      subject: 'Your Nano Spaces subscription has been cancelled',
      html: gracePeriodTemplate(graceEndsFormatted, `${env.NEXT_PUBLIC_APP_URL}/settings/billing`),
    }).catch(() => null)
  }

  return success({ graceEndsAt })
})
