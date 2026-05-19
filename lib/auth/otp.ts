import { randomInt } from 'crypto'
import { createHash } from 'crypto'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10

/** Generates a cryptographically random 6-digit OTP code. */
export function generateOtpCode(): string {
  const code = randomInt(0, 1_000_000)
  return code.toString().padStart(OTP_LENGTH, '0')
}

/** SHA-256 hash of the code for safe database storage. */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/** Returns the expiry timestamp (now + 10 minutes). */
export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
}
