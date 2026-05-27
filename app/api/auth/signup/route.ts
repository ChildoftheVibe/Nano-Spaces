import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { isPasswordBreached } from '@/lib/auth/password'
import { RateLimitError, ValidationError } from '@/lib/errors/AppError'
import { checkRateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100),
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
})

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48)
  const suffix = Math.random().toString(36).substring(2, 7)
  return `${base}-${suffix}`
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rl = await checkRateLimit('signup', ip)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Too many sign-up attempts. Please try again later.',
      requestId,
    })
  }

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { fullName, orgName, email, password } = parsed.data

  const breached = await isPasswordBreached(password)
  if (breached) {
    throw new ValidationError({
      userMessage:
        'This password has appeared in a known data breach. Please choose a different one.',
      requestId,
    })
  }

  const admin = createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError ?? !created.user) {
    if (createError?.message?.includes('already registered')) {
      throw new ValidationError({
        userMessage: 'An account with this email already exists.',
        requestId,
      })
    }
    throw new Error('Failed to create account.')
  }

  const userId = created.user.id

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug: buildSlug(orgName), display_name: orgName })
    .select('id')
    .single()

  if (orgError ?? !org) {
    await admin.auth.admin.deleteUser(userId)
    throw new Error('Failed to create organization.')
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    full_name: fullName,
    email,
    role: 'org_admin',
    org_id: org.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('organizations').delete().eq('id', org.id)
    throw new Error('Failed to create profile.')
  }

  await admin.from('activity_log').insert({
    org_id: org.id,
    actor_id: userId,
    action: 'org_created',
    target_type: 'organization',
    target_id: org.id,
    details: { name: orgName, via: 'email_signup' },
  })

  return success({ email })
})
