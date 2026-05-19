import * as Sentry from '@sentry/nextjs'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const LIMITS = {
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    prefix: 'rl:login',
  }),
  twoFaVerify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'rl:2fa',
  }),
  otpSend: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    prefix: 'rl:otp_send',
  }),
  forgotPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '60 m'),
    prefix: 'rl:forgot_pw',
  }),
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:default',
  }),
  export: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(1, '24 h'),
    prefix: 'rl:export',
  }),
  inviteSend: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '60 m'),
    prefix: 'rl:invite_send',
  }),
} as const

export type RateLimitKey = keyof typeof LIMITS

export type RateLimitResult = { success: true } | { success: false; retryAfterSeconds: number }

export async function checkRateLimit(
  key: RateLimitKey,
  identifier: string,
): Promise<RateLimitResult> {
  try {
    // eslint-disable-next-line security/detect-object-injection
    const result = await LIMITS[key].limit(identifier)
    if (result.success) return { success: true }
    return {
      success: false,
      retryAfterSeconds: Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (error) {
    // Fail OPEN — Redis unavailable should not block legitimate users
    Sentry.captureException(error, {
      level: 'warning',
      extra: { context: 'rate_limit_failure', key, identifier },
    })
    return { success: true }
  }
}
