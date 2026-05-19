import { randomBytes, createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { invitationEmailTemplate } from '@/lib/email/auth-templates'
import { checkUserLimit } from '@/lib/tiers'
import { env } from '@/lib/env'
import { AuthError, ValidationError, ConflictError, TierLimitError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'org_admin']).default('user'),
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
    .select('role, org_id, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()
  const { email, role } = parsed.data
  const orgId = profile.org_id

  // Check no existing active member with this email
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', email)
    .single()

  if (existing) {
    throw new ConflictError({
      userMessage: 'A user with this email already exists in your org.',
      requestId,
    })
  }

  // Check no pending invite
  const { data: pendingInvite } = await admin
    .from('invitations')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', email)
    .eq('accepted', false)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (pendingInvite) {
    throw new ConflictError({
      userMessage: 'A pending invitation already exists for this email.',
      requestId,
    })
  }

  // Tier limit check
  const tierCheck = await checkUserLimit(orgId)
  if (!tierCheck.allowed) {
    throw new TierLimitError({
      userMessage: `Your plan allows up to ${tierCheck.limit} users. Please upgrade to invite more.`,
      requestId,
    })
  }

  // Generate token (raw stored only in email link; hash stored in DB)
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const { data: invite, error: insertError } = await admin
    .from('invitations')
    .insert({
      org_id: orgId,
      email,
      role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !invite) {
    throw new Error('Failed to create invitation.')
  }

  const { data: org } = await admin
    .from('organizations')
    .select('display_name')
    .eq('id', orgId)
    .single()

  const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/join?token=${rawToken}`

  await sendEmail({
    to: email,
    subject: `You've been invited to ${org?.display_name ?? 'Nano Spaces'}`,
    html: invitationEmailTemplate(
      profile.full_name ?? 'Your administrator',
      org?.display_name ?? 'Nano Spaces',
      role,
      acceptUrl,
    ),
    requestId,
  })

  await admin.from('activity_log').insert({
    org_id: orgId,
    actor_id: user.id,
    action: 'invitation_sent',
    target_type: 'invitation',
    target_id: invite.id,
    details: { email, role },
  })

  return success({ id: invite.id })
})
