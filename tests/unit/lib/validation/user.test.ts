import { describe, it, expect } from 'vitest'
import {
  updateProfileSchema,
  changePasswordSchema,
  pushSubscriptionSchema,
} from '@/lib/validation/user'

describe('updateProfileSchema', () => {
  it('accepts all optional fields', () => {
    const result = updateProfileSchema.safeParse({
      full_name: 'Alice',
      timezone: 'America/New_York',
      email_reminders: true,
      reminder_timing: '24h',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (all optional)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true)
  })

  it('rejects empty full_name string', () => {
    const result = updateProfileSchema.safeParse({ full_name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Name is required')
  })

  it('rejects full_name over 100 chars', () => {
    const result = updateProfileSchema.safeParse({ full_name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid reminder_timing values', () => {
    const result = updateProfileSchema.safeParse({ reminder_timing: 'weekly' })
    expect(result.success).toBe(false)
  })

  it('accepts null reminder_timing', () => {
    const result = updateProfileSchema.safeParse({ reminder_timing: null })
    expect(result.success).toBe(true)
  })

  it('accepts all valid reminder_timing values', () => {
    for (const v of ['24h', '1h', 'both'] as const) {
      expect(updateProfileSchema.safeParse({ reminder_timing: v }).success).toBe(true)
    }
  })
})

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'old',
    newPassword: 'NewStrongPass1!',
    confirmPassword: 'NewStrongPass1!',
  }

  it('accepts valid matching passwords', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty currentPassword', () => {
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Current password is required')
  })

  it('rejects short newPassword', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: 'Short1!',
      confirmPassword: 'Short1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('12 characters'))).toBe(true)
  })

  it('rejects newPassword without uppercase', () => {
    const pw = 'alllowercase1!'
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: pw,
      confirmPassword: pw,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('uppercase'))).toBe(true)
  })

  it('rejects newPassword without digit', () => {
    const pw = 'NoDigitsHereXX!'
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: pw,
      confirmPassword: pw,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message.includes('number'))).toBe(true)
  })

  it('rejects mismatched confirmPassword', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: 'WrongPass1!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Passwords do not match')
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword'])
  })
})

describe('pushSubscriptionSchema', () => {
  const valid = {
    endpoint: 'https://push.example.com/sub/abc',
    p256dh: 'base64key',
    auth_key: 'authvalue',
  }

  it('accepts valid push subscription', () => {
    expect(pushSubscriptionSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional user_agent', () => {
    expect(pushSubscriptionSchema.safeParse({ ...valid, user_agent: 'Chrome/120' }).success).toBe(
      true,
    )
  })

  it('accepts null user_agent', () => {
    expect(pushSubscriptionSchema.safeParse({ ...valid, user_agent: null }).success).toBe(true)
  })

  it('rejects non-URL endpoint', () => {
    const result = pushSubscriptionSchema.safeParse({ ...valid, endpoint: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects empty p256dh', () => {
    const result = pushSubscriptionSchema.safeParse({ ...valid, p256dh: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty auth_key', () => {
    const result = pushSubscriptionSchema.safeParse({ ...valid, auth_key: '' })
    expect(result.success).toBe(false)
  })
})
