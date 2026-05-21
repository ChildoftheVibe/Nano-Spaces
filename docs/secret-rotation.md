# Secret Rotation Schedule & Procedure

All secrets are stored as Vercel environment variables. After rotation, redeploy from main to pick up the new values.

---

## Rotation Schedule

| Secret                      | Rotation Interval          | Last Rotated | Next Due |
| --------------------------- | -------------------------- | ------------ | -------- |
| `NEXTAUTH_SECRET`           | 90 days                    | —            | —        |
| `SUPABASE_SERVICE_ROLE_KEY` | 180 days                   | —            | —        |
| `RESEND_API_KEY`            | 180 days                   | —            | —        |
| `PAYPAL_CLIENT_SECRET`      | 90 days                    | —            | —        |
| `PAYPAL_WEBHOOK_ID`         | On webhook re-registration | —            | —        |
| `CRON_SECRET`               | 30 days                    | —            | —        |
| `TURNSTILE_SECRET_KEY`      | 180 days                   | —            | —        |
| `WEB_PUSH_PRIVATE_KEY`      | 365 days                   | —            | —        |
| `SENTRY_AUTH_TOKEN`         | 90 days                    | —            | —        |
| `UPSTASH_REDIS_REST_TOKEN`  | 180 days                   | —            | —        |

---

## Procedures by Secret

### `NEXTAUTH_SECRET`

1. Generate: `openssl rand -base64 32`
2. Update in Vercel dashboard → Settings → Environment Variables
3. Redeploy from main branch
4. **Effect:** all existing 2FA cookies are invalidated — users will be required to re-verify 2FA

### `SUPABASE_SERVICE_ROLE_KEY`

1. Supabase Dashboard → Project Settings → API → Roll service role key
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel
3. Redeploy
4. **Effect:** no user-facing impact (server-only key)

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

1. Supabase Dashboard → Project Settings → API → Roll anon key
2. Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
3. Redeploy
4. **Effect:** brief 401s for in-flight requests during deploy rollover

### `RESEND_API_KEY`

1. Resend Dashboard → API Keys → Create new key → delete old
2. Update in Vercel, redeploy
3. **Effect:** transactional emails fail during the gap — monitor Resend dashboard

### `PAYPAL_CLIENT_SECRET`

1. PayPal Developer Console → My Apps → App → Secret → Rotate
2. Update `PAYPAL_CLIENT_SECRET` in Vercel, redeploy
3. **Effect:** billing webhook verification fails until deploy completes

### `CRON_SECRET`

1. Generate: `openssl rand -hex 32`
2. Update in Vercel **and** in Vercel Cron configuration (or GitHub Actions secrets if self-hosted)
3. Redeploy
4. **Effect:** cron jobs fail between secret update and deploy — schedule rotation during low-traffic window

### `WEB_PUSH_PRIVATE_KEY` + `WEB_PUSH_PUBLIC_KEY`

> **Warning:** VAPID key pairs cannot be rotated without invalidating all existing push subscriptions. All users will need to re-subscribe to push notifications.

1. Generate new pair: `npx web-push generate-vapid-keys`
2. Update both `WEB_PUSH_PRIVATE_KEY` and `WEB_PUSH_PUBLIC_KEY` in Vercel
3. Delete all rows from `push_subscriptions` table in Supabase
4. Redeploy
5. **Effect:** all users lose push notifications until they revisit Settings and re-subscribe

### `UPSTASH_REDIS_REST_TOKEN`

1. Upstash Console → Database → REST API → Reset token
2. Update in Vercel, redeploy
3. **Effect:** rate limiting fails open (allows all requests) until deploy completes

---

## Emergency Rotation (Suspected Compromise)

1. Immediately update the compromised secret in Vercel and trigger a redeploy
2. Review Sentry for unusual error patterns in the preceding 24 hours
3. Check Supabase auth logs for suspicious sign-ins
4. Rotate any secret that may have been derived from the compromised one
5. File a security incident report (see `incident-response.md`)
6. For `NEXTAUTH_SECRET` compromise: invalidate all Supabase sessions via admin API

---

## Secret Storage Rules

- Never commit secrets to git (`.env` is in `.gitignore`)
- Never log secrets in application code
- Never send secrets in Slack or email — use Vercel dashboard or 1Password
- `.env.example` documents required variable names with placeholder values only
