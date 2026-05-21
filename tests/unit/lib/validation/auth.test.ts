import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  twoFaCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changeEmailSchema,
  totpEnrollVerifySchema,
} from '@/lib/validation/auth'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('accepts optional turnstileToken', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
      turnstileToken: 'tok',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address')
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Password is required')
  })

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
  })
})

describe('twoFaCodeSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(twoFaCodeSchema.safeParse({ code: '123456' }).success).toBe(true)
  })

  it('rejects fewer than 6 digits', () => {
    const result = twoFaCodeSchema.safeParse({ code: '12345' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Code must be exactly 6 digits')
  })

  it('rejects more than 6 digits', () => {
    expect(twoFaCodeSchema.safeParse({ code: '1234567' }).success).toBe(false)
  })

  it('rejects non-digit characters', () => {
    const result = twoFaCodeSchema.safeParse({ code: '12345a' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Code must contain only digits')
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address')
  })

  it('accepts optional turnstileToken', () => {
    expect(
      forgotPasswordSchema.safeParse({ email: 'user@example.com', turnstileToken: 'x' }).success,
    ).toBe(true)
  })
})

describe('resetPasswordSchema', () => {
  const valid = { password: 'ValidPass1234!', confirmPassword: 'ValidPass1234!' }

  it('accepts matching strong passwords', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects passwords shorter than 12 chars', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Short1!',
      confirmPassword: 'Short1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('12 characters'))).toBe(true)
  })

  it('rejects passwords without uppercase', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'alllowercase1!',
      confirmPassword: 'alllowercase1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('uppercase'))).toBe(true)
  })

  it('rejects passwords without lowercase', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'ALLUPPERCASE1!',
      confirmPassword: 'ALLUPPERCASE1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('lowercase'))).toBe(true)
  })

  it('rejects passwords without a number', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NoNumbersHere!',
      confirmPassword: 'NoNumbersHere!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('number'))).toBe(true)
  })

  it('rejects non-matching confirmPassword', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'ValidPass1234!',
      confirmPassword: 'Different1234!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Passwords do not match')
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword'])
  })
})

describe('changeEmailSchema', () => {
  it('accepts valid new email and current password', () => {
    const result = changeEmailSchema.safeParse({
      newEmail: 'new@example.com',
      currentPassword: 'somepassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid new email', () => {
    const result = changeEmailSchema.safeParse({
      newEmail: 'not-email',
      currentPassword: 'somepassword',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address')
  })

  it('rejects empty current password', () => {
    const result = changeEmailSchema.safeParse({ newEmail: 'new@example.com', currentPassword: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Current password is required for email change')
  })
})

describe('totpEnrollVerifySchema', () => {
  it('accepts 6-digit code', () => {
    expect(totpEnrollVerifySchema.safeParse({ code: '654321' }).success).toBe(true)
  })

  it('rejects non-numeric 6-char code', () => {
    expect(totpEnrollVerifySchema.safeParse({ code: 'abcdef' }).success).toBe(false)
  })
})
