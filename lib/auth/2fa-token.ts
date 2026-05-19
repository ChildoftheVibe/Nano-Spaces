/**
 * Stateless 2FA completion cookie using Web Crypto HMAC-SHA256.
 * Edge-runtime compatible — no Node.js crypto module.
 *
 * Cookie format: base64url(userId):expireMs:hex(hmac)
 */

const COOKIE_NAME = 'ns_2fa' as const
const TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

export { COOKIE_NAME as TWO_FA_COOKIE_NAME }

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function signHmac(key: CryptoKey, data: string): Promise<string> {
  const enc = new TextEncoder()
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Creates a signed 2FA cookie value for the given userId. */
export async function create2faCookieValue(userId: string, secret: string): Promise<string> {
  const exp = Date.now() + TTL_MS
  const payload = `${userId}:${exp}`
  const key = await importHmacKey(secret)
  const sig = await signHmac(key, payload)
  return `${payload}:${sig}`
}

/** Verifies a 2FA cookie value. Returns userId on success, null on failure. */
export async function verify2faCookieValue(value: string, secret: string): Promise<string | null> {
  const parts = value.split(':')
  if (parts.length !== 3) return null

  const [userId, expStr, sig] = parts as [string, string, string]
  const exp = parseInt(expStr, 10)

  if (!userId || isNaN(exp) || Date.now() > exp) return null

  const payload = `${userId}:${expStr}`
  const key = await importHmacKey(secret)
  const expectedSig = await signHmac(key, payload)

  // Constant-time comparison (both are hex strings of same length)
  if (sig.length !== expectedSig.length) return null
  let diff = 0
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }

  return diff === 0 ? userId : null
}

/** Builds a Set-Cookie header string for the 2FA cookie. */
export function build2faCookieHeader(value: string, isProd: boolean): string {
  const maxAge = Math.floor(TTL_MS / 1000)
  return [
    `${COOKIE_NAME}=${value}`,
    `HttpOnly`,
    `Path=/`,
    `SameSite=Strict`,
    `Max-Age=${maxAge}`,
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

/** Builds a Set-Cookie header that expires the 2FA cookie immediately. */
export function clear2faCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`
}
