import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { announcementEmailTemplate } from '@/lib/email/auth-templates'
import { checkRateLimit } from '@/lib/rate-limit'
import { AuthError, ValidationError, RateLimitError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
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

  // Limit to 5 announcements per org per hour
  const rl = await checkRateLimit('default', `announce:${profile.org_id}`)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Too many announcements. Please wait before sending another.',
      requestId,
    })
  }

  const admin = createAdminClient()

  const [{ data: org }, { data: members }] = await Promise.all([
    admin
      .from('organizations')
      .select('display_name, email_signature')
      .eq('id', profile.org_id)
      .single(),
    admin.from('profiles').select('email').eq('org_id', profile.org_id).eq('is_active', true),
  ])

  const orgName = org?.display_name ?? 'Nano Spaces'
  const signature = org?.email_signature ?? null
  const { message } = parsed.data

  const emailPromises = (members ?? []).map((m) =>
    sendEmail({
      to: m.email,
      subject: `Message from ${orgName}`,
      html: announcementEmailTemplate(orgName, message, signature),
      requestId,
    }).catch(() => null),
  )

  await Promise.all(emailPromises)

  await admin.from('activity_log').insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: 'announcement_sent',
    target_type: 'organization',
    target_id: profile.org_id,
    details: { recipient_count: members?.length ?? 0 },
  })

  return success({ sent: members?.length ?? 0 })
})
