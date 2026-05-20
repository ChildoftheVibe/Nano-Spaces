import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    throw new AuthError({ userMessage: 'Unauthorized.', requestId: crypto.randomUUID() })
  }

  const admin = createAdminClient()
  const { data: processed, error } = await admin.rpc('advance_expired_waitlist')

  if (error) throw new Error('Waitlist processing failed.')

  return success({ processed: processed as number })
})
