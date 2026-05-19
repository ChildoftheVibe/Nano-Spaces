import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (_req: NextRequest) => {
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

  const { data: invoices } = await admin
    .from('invoices')
    .select(
      'id, amount_usd, tier, billing_period_start, billing_period_end, status, pdf_url, created_at',
    )
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(24)

  // pdf_url stores the storage path — generate fresh signed URLs (1-hour TTL)
  const invoicesWithUrls = await Promise.all(
    (invoices ?? []).map(async (inv) => {
      let downloadUrl: string | null = null
      if (inv.pdf_url) {
        const { data } = await admin.storage.from('invoices').createSignedUrl(inv.pdf_url, 3600)
        downloadUrl = data?.signedUrl ?? null
      }
      return { ...inv, downloadUrl }
    }),
  )

  return success({ invoices: invoicesWithUrls })
})
