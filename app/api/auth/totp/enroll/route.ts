import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { generateTotpSecret, getTotpUri, encryptTotpSecret } from '@/lib/auth/totp'
import { AuthError } from '@/lib/errors/AppError'

/** GET — generate a new TOTP secret and return the otpauth URI for QR code display */
export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()

  if (error || !user?.email) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('totp_secret')
    .eq('id', user.id)
    .single()

  // Don't overwrite an existing active TOTP setup; enrollment should be explicit
  if (profile?.totp_secret) {
    throw new AuthError({
      userMessage: 'TOTP is already configured. Disable it before re-enrolling.',
      requestId,
    })
  }

  const secret = generateTotpSecret()
  const uri = getTotpUri(secret, user.email)
  const encryptedSecret = encryptTotpSecret(secret)

  // Store pending secret — not yet activated (two_fa_enabled stays false until verified)
  await adminClient.from('profiles').update({ totp_secret: encryptedSecret }).eq('id', user.id)

  return success({ uri, secret })
})
