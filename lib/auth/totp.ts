import { generateSecret, verifySync, generateURI } from 'otplib'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { env } from '@/lib/env'
import { deriveEncryptionKey } from './password'

const CIPHER = 'aes-256-gcm' as const
const encryptionKey = deriveEncryptionKey(env.NEXTAUTH_SECRET)

export function generateTotpSecret(): string {
  return generateSecret()
}

export function getTotpUri(secret: string, email: string): string {
  return generateURI({ issuer: 'Nano Spaces', label: email, secret })
}

export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    const result = verifySync({ token: code, secret })
    if (typeof result === 'boolean') return result
    // VerifyResult can also be { isValid: boolean } with guardrails enabled
    if (result !== null && typeof result === 'object' && 'isValid' in result) {
      return (result as { isValid: boolean }).isValid
    }
    return false
  } catch {
    return false
  }
}

export function encryptTotpSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(CIPHER, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), encrypted.toString('hex'), tag.toString('hex')].join('.')
}

export function decryptTotpSecret(ciphertext: string): string {
  const parts = ciphertext.split('.')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, encHex, tagHex] = parts as [string, string, string]
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')

  const decipher = createDecipheriv(CIPHER, encryptionKey, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}
