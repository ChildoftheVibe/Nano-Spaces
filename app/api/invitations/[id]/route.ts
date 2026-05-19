import { randomBytes, createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { invitationEmailTemplate } from '@/lib/email/auth-templates'
import { env } from '@/lib/env'
import { AuthError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  action: z.enum(['resend', 'revoke']),
})

export const POST = withErrorHandling(async (req: NextRequest, ctx) => {
  const requestId = crypto.randomUUID()
  const id = (ctx.params as Record<string, string>)['id'] ?? ''

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
    .select('role, org_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invitations')
    .select('id, email, role, org_id, resend_count, accepted, revoked, expires_at')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (!invite) {
    throw new NotFoundError({ userMessage: 'Invitation not found.', requestId })
  }

  if (invite.accepted) {
    throw new ConflictError({
      userMessage: 'This invitation has already been accepted.',
      requestId,
    })
  }

  const { action } = parsed.data

  if (action === 'revoke') {
    await admin.from('invitations').update({ revoked: true }).eq('id', id)

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'invitation_revoked',
      target_type: 'invitation',
      target_id: invite.id,
      details: { email: invite.email },
    })

    return success({ revoked: true })
  }

  // resend
  if (invite.revoked) {
    throw new ConflictError({ userMessage: 'This invitation has been revoked.', requestId })
  }

  if (invite.resend_count >= 3) {
    throw new ConflictError({
      userMessage: 'Maximum resend limit (3) reached for this invitation.',
      requestId,
    })
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  await admin
    .from('invitations')
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
      resend_count: invite.resend_count + 1,
      last_sent_at: new Date().toISOString(),
    })
    .eq('id', id)

  const { data: org } = await admin
    .from('organizations')
    .select('display_name')
    .eq('id', profile.org_id)
    .single()

  const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/join?token=${rawToken}`

  await sendEmail({
    to: invite.email,
    subject: `You've been invited to ${org?.display_name ?? 'Nano Spaces'}`,
    html: invitationEmailTemplate(
      profile.full_name ?? 'Your administrator',
      org?.display_name ?? 'Nano Spaces',
      invite.role,
      acceptUrl,
    ),
    requestId,
  })

  await admin.from('activity_log').insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: 'invitation_resent',
    target_type: 'invitation',
    target_id: invite.id,
    details: { email: invite.email, resend_count: invite.resend_count + 1 },
  })

  return success({ resent: true })
})
