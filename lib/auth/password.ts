import { createHash } from 'crypto'
import { withRetry } from '@/lib/retry'

/**
 * Checks a password against the HaveIBeenPwned Pwned Passwords API
 * using k-anonymity — only the first 5 chars of the SHA-1 hash are sent.
 * Returns true if the password appears in a known breach.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  const response = await withRetry(
    () =>
      fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        next: { revalidate: 0 },
      }),
    { maxAttempts: 2, baseMs: 500 },
  )

  if (!response.ok) {
    // Fail open — don't block users if HIBP is down
    return false
  }

  const text = await response.text()
  const lines = text.split('\r\n')

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const hashSuffix = line.slice(0, colonIdx)
    if (hashSuffix === suffix) return true
  }

  return false
}

/**
 * Derives a 32-byte AES key from a passphrase using SHA-256.
 * Used for encrypting TOTP secrets at rest.
 */
export function deriveEncryptionKey(passphrase: string): Buffer {
  return createHash('sha256').update(passphrase).digest()
}
