import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().min(1),
  PAYPAL_STARTER_PLAN_ID: z.string().min(1),
  PAYPAL_GROWTH_PLAN_ID: z.string().min(1),
  PAYPAL_ENVIRONMENT: z.enum(['sandbox', 'live']),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  WEB_PUSH_PUBLIC_KEY: z.string().min(1),
  WEB_PUSH_PRIVATE_KEY: z.string().min(1),
  WEB_PUSH_EMAIL: z.string().startsWith('mailto:'),
  SENTRY_DSN: z.string().url(),
  SENTRY_AUTH_TOKEN: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(1),
})

function parseEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const formatted = result.error.format()
    console.error('❌ Invalid environment variables:', JSON.stringify(formatted, null, 2))
    throw new Error('Invalid environment variables — check your .env file')
  }
  return result.data
}

export const env = parseEnv()

export type Env = z.infer<typeof envSchema>
