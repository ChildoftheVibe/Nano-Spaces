import { env } from '@/lib/env'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Fails open if the Turnstile service is unreachable — don't block legitimate users.
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
    })
    if (ip) body.set('remoteip', ip)

    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    if (!res.ok) return true // fail open on HTTP error

    const json = (await res.json()) as { success: boolean }
    return json.success === true
  } catch {
    return true // fail open if network is unavailable
  }
}
