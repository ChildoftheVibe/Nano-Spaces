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
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(12).max(128),
  role: z.enum(['user', 'org_admin']),
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

    const { fullName, email, password, role } = parsed.data
    const admin = createAdminClient()

    const { data: org } = await admin.from('organizations').select('id').eq('id', orgId).single()
    if (!org) throw new NotFoundError({ userMessage: 'Organization not found.', requestId })

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
      throw new Error('Failed to create user.')
    }

    const newUserId = created.user.id

    const { error: profileError } = await admin.from('profiles').insert({
      id: newUserId,
      full_name: fullName,
      email,
      role,
      org_id: orgId,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(newUserId)
      throw new Error('Failed to create profile.')
    }

    await admin.from('activity_log').insert({
      org_id: orgId,
      actor_id: user.id,
      action: 'user_added_by_super_admin',
      target_type: 'profile',
      target_id: newUserId,
      details: { email, role },
    })

    return success({ userId: newUserId })
  },
)
