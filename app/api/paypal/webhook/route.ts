import type { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, PLAN_TIER_MAP } from '@/lib/paypal/client'
import { createAndStoreInvoice } from '@/lib/paypal/invoice'

interface PayPalEvent {
  id: string
  event_type: string
  resource: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function str(v: unknown): string {
  return String(v ?? '')
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function num(v: unknown): number {
  return Number(v ?? 0)
}

export const POST = async (req: NextRequest): Promise<Response> => {
  const requestId = crypto.randomUUID()
  const rawBody = await req.text()

  // 1. Verify PayPal signature
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  const valid = await verifyWebhookSignature(headers, rawBody).catch(() => false)
  if (!valid) {
    Sentry.captureMessage('PayPal webhook signature verification failed', {
      level: 'warning',
      extra: { requestId },
    })
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: PayPalEvent
  try {
    event = JSON.parse(rawBody) as PayPalEvent
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 2. Idempotency: insert-first to close the TOCTOU window between the SELECT
  // and the eventual INSERT. A PK conflict means this event was already processed.
  const { error: idempotencyError } = await admin
    .from('processed_webhooks')
    .insert({ event_id: event.id, source: 'paypal' })

  if (idempotencyError) {
    // PK violation (code 23505) = duplicate delivery; anything else = real error
    if (idempotencyError.code === '23505') {
      return Response.json({ ok: true, skipped: true })
    }
    Sentry.captureException(idempotencyError, {
      extra: { eventId: event.id, requestId },
    })
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }

  try {
    await handleEvent(event, admin, requestId)
  } catch (err) {
    Sentry.captureException(err, {
      extra: { eventId: event.id, eventType: event.event_type, requestId },
    })
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEvent(event: PayPalEvent, admin: any, requestId: string): Promise<void> {
  const resource = event.resource

  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const subscriptionId = str(resource['id'])
      const planId = str(resource['plan_id'] ?? (resource as Record<string, unknown>)['plan_id'])
      const orgId = str(resource['custom_id'])

      const tierConfig = PLAN_TIER_MAP[planId]
      if (!tierConfig) {
        throw new Error(`Unknown plan_id: ${planId}`)
      }

      // billing_info.next_billing_time gives the next renewal date
      const billingInfo = resource['billing_info'] as Record<string, unknown> | undefined
      const nextBilling = str(billingInfo?.['next_billing_time'])
      const expiresAt = nextBilling
        ? new Date(nextBilling).toISOString()
        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()

      await admin
        .from('organizations')
        .update({
          subscription_status: 'active',
          subscription_tier: tierConfig.tier,
          paypal_subscription_id: subscriptionId,
          paypal_plan_id: planId,
          subscription_expires_at: expiresAt,
          grace_period_ends_at: null,
          tier_room_limit: tierConfig.roomLimit,
          tier_admin_limit: tierConfig.adminLimit,
          tier_user_limit: tierConfig.userLimit,
        })
        .eq('id', orgId)

      await admin.from('activity_log').insert({
        org_id: orgId,
        actor_id: null,
        action: 'subscription_activated',
        target_type: 'organization',
        target_id: orgId,
        details: { tier: tierConfig.tier, plan_id: planId, subscription_id: subscriptionId },
      })
      break
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      const subscriptionId = str(resource['id'])
      const orgId = str(resource['custom_id'])

      const graceEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

      await admin
        .from('organizations')
        .update({
          subscription_status: 'grace',
          grace_period_ends_at: graceEndsAt,
        })
        .eq('paypal_subscription_id', subscriptionId)

      await admin.from('activity_log').insert({
        org_id: orgId,
        actor_id: null,
        action: 'subscription_cancelled',
        target_type: 'organization',
        target_id: orgId,
        details: { grace_ends_at: graceEndsAt },
      })
      break
    }

    case 'PAYMENT.SALE.COMPLETED': {
      const transactionId = str(resource['id'])
      const amountObj = resource['amount'] as Record<string, unknown> | undefined
      const amountUsd = num(amountObj?.['total'])

      // billing_agreement_id is the subscription ID
      const subscriptionId = str(resource['billing_agreement_id'])

      // Look up org by subscription ID
      const { data: org } = await admin
        .from('organizations')
        .select('id, display_name, primary_timezone, subscription_tier')
        .eq('paypal_subscription_id', subscriptionId)
        .single()

      if (!org) {
        throw new Error(`No org found for subscription: ${subscriptionId}`)
      }

      // Look up org admin email
      const { data: adminProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('org_id', org.id)
        .eq('role', 'org_admin')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const now = new Date()
      const periodStart = now
      const periodEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)

      // Update subscription_expires_at to new period end
      await admin
        .from('organizations')
        .update({
          subscription_expires_at: periodEnd.toISOString(),
        })
        .eq('id', org.id)

      // Create invoice record
      const tierConfig = Object.values(PLAN_TIER_MAP).find(
        (t) => t.tier === str(org.subscription_tier),
      )
      const { data: invoice } = await admin
        .from('invoices')
        .insert({
          org_id: org.id,
          paypal_transaction_id: transactionId,
          amount_usd: amountUsd || (tierConfig?.amount ?? 0),
          tier: str(org.subscription_tier),
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          status: 'paid',
        })
        .select('id')
        .single()

      if (invoice && adminProfile) {
        await createAndStoreInvoice(
          {
            orgId: org.id,
            orgName: str(org.display_name),
            orgEmail: str(adminProfile.email),
            invoiceId: str(invoice.id),
            tier: str(org.subscription_tier),
            amountUsd: amountUsd || (tierConfig?.amount ?? 0),
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            paypalTransactionId: transactionId,
            invoiceRecordId: str(invoice.id),
          },
          requestId,
        )
      }
      break
    }

    default:
      // Unknown event type — log but don't fail
      break
  }
}
