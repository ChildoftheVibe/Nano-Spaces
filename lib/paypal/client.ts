import { env } from '@/lib/env'

const BASE =
  env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

let cachedToken: { value: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value
  }

  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString(
    'base64',
  )

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }
  return cachedToken.value
}

export interface CreateSubscriptionResult {
  subscriptionId: string
  approvalUrl: string
}

export async function createSubscription(
  planId: string,
  orgId: string,
  returnUrl: string,
  cancelUrl: string,
): Promise<CreateSubscriptionResult> {
  const token = await getAccessToken()

  const body = {
    plan_id: planId,
    custom_id: orgId,
    application_context: {
      brand_name: 'Nano Spaces',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  }

  const res = await fetch(`${BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal createSubscription failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as {
    id: string
    links: Array<{ rel: string; href: string }>
  }

  const approvalLink = data.links.find((l) => l.rel === 'approve')
  if (!approvalLink) throw new Error('No approval URL in PayPal response')

  return { subscriptionId: data.id, approvalUrl: approvalLink.href }
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  })

  if (!res.ok && res.status !== 422) {
    throw new Error(`PayPal cancelSubscription failed: ${res.status}`)
  }
}

export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string,
): Promise<boolean> {
  const token = await getAccessToken()

  const payload = {
    auth_algo: headers['paypal-auth-algo'] ?? '',
    cert_url: headers['paypal-cert-url'] ?? '',
    transmission_id: headers['paypal-transmission-id'] ?? '',
    transmission_sig: headers['paypal-transmission-sig'] ?? '',
    transmission_time: headers['paypal-transmission-time'] ?? '',
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(rawBody) as unknown,
  }

  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) return false

  const data = (await res.json()) as { verification_status: string }
  return data.verification_status === 'SUCCESS'
}

export const PLAN_TIER_MAP: Record<
  string,
  { tier: string; amount: number; roomLimit: number; adminLimit: number; userLimit: number | null }
> = {
  [env.PAYPAL_STARTER_PLAN_ID]: {
    tier: 'starter',
    amount: 19.99,
    roomLimit: 5,
    adminLimit: 1,
    userLimit: 100,
  },
  [env.PAYPAL_GROWTH_PLAN_ID]: {
    tier: 'growth',
    amount: 39.99,
    roomLimit: 20,
    adminLimit: 3,
    userLimit: null,
  },
}
