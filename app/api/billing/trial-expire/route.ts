import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { sendEmail } from '@/lib/email/send'
import { trialExpiredTemplate } from '@/lib/email/auth-templates'
import { env } from '@/lib/env'

export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const billingUrl = `${env.NEXT_PUBLIC_APP_URL}/settings/billing`

  const { data: expiredTrials } = await admin
    .from('organizations')
    .select('id, display_name')
    .eq('subscription_status', 'trial')
    .lt('trial_ends_at', now)

  for (const org of expiredTrials ?? []) {
    await admin.from('organizations').update({ subscription_status: 'inactive' }).eq('id', org.id)

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
      await sendEmail({
        to: adminProfile.email as string,
        subject: 'Your Nano Spaces trial has ended',
        html: trialExpiredTemplate(billingUrl),
      }).catch(() => null)
    }

    await admin.from('activity_log').insert({
      org_id: org.id,
      actor_id: null,
      action: 'trial_expired',
      target_type: 'organization',
      target_id: org.id,
      details: {},
    })
  }

  return Response.json({ ok: true, expired: expiredTrials?.length ?? 0 })
}
