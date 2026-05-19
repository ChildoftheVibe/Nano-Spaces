import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { accountDeletionRequestAdminTemplate } from '@/lib/email/auth-templates'
import { AuthError } from '@/lib/errors/AppError'

export const POST = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new AuthError({ userMessage: 'Profile not found.', requestId })
  }

  // Log the deletion request
  await admin.from('activity_log').insert({
    org_id: profile.org_id ?? '00000000-0000-0000-0000-000000000000',
    actor_id: user.id,
    action: 'account_deletion_requested',
    target_type: 'profile',
    target_id: user.id,
    details: { requested_at: new Date().toISOString() },
  })

  // Notify the org admin (if user belongs to an org)
  if (profile.org_id && profile.role !== 'org_admin') {
    const [{ data: adminProfiles }, { data: org }] = await Promise.all([
      admin.from('profiles').select('email').eq('org_id', profile.org_id).eq('role', 'org_admin'),
      admin.from('organizations').select('name').eq('id', profile.org_id).single(),
    ])

    if (adminProfiles && adminProfiles.length > 0) {
      await Promise.allSettled(
        adminProfiles.map((a) =>
          sendEmail({
            to: a.email,
            subject: `Account deletion requested — ${profile.full_name ?? profile.email}`,
            html: accountDeletionRequestAdminTemplate(
              profile.full_name ?? profile.email,
              profile.email,
              org?.name ?? 'your organization',
            ),
            requestId,
          }),
        ),
      )
    }
  }

  return success({ requested: true })
})
