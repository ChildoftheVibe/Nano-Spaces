'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ─── Types ───────────────────────────────────────────────────────────────────

type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'inactive' | 'expired'

type OrgBillingData = {
  id: string
  display_name: string
  subscription_status: SubscriptionStatus
  subscription_tier: string
  trial_starts_at: string | null
  trial_ends_at: string | null
  subscription_expires_at: string | null
  grace_period_ends_at: string | null
  paypal_subscription_id: string | null
  tier_room_limit: number
  tier_admin_limit: number
  tier_user_limit: number | null
}

type SeatUsage = {
  rooms: { current: number; limit: number }
  admins: { current: number; limit: number }
  users: { current: number; limit: number | null }
}

type Invoice = {
  id: string
  amount_usd: number
  tier: string
  billing_period_start: string
  billing_period_end: string
  status: string
  pdf_url: string | null
  created_at: string
  downloadUrl: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const PLAN_PRICES: Record<string, string> = { starter: '$19.99/mo', growth: '$39.99/mo' }
const PLAN_LABELS: Record<string, string> = { starter: 'Starter', growth: 'Growth' }

function statusBadge(status: SubscriptionStatus) {
  const map: Record<SubscriptionStatus, { label: string; cls: string }> = {
    trial: { label: 'Trial', cls: 'bg-blue-100 text-blue-700' },
    active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
    grace: { label: 'Grace Period', cls: 'bg-yellow-100 text-yellow-700' },
    inactive: { label: 'Inactive', cls: 'bg-red-100 text-red-700' },
    expired: { label: 'Expired', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}

function UsageBar({ current, limit }: { current: number; limit: number | null }) {
  if (limit === null) {
    return (
      <span className="text-sm text-gray-500">
        {current} / <span className="font-medium text-gray-700">Unlimited</span>
      </span>
    )
  }
  const pct = Math.min(100, Math.round((current / limit) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-[var(--brand-primary)]'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {current} / {limit}
        </span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Banners ─────────────────────────────────────────────────────────────────

function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const days = daysUntil(trialEndsAt)
  if (days < 0) return null
  const urgent = days <= 2
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${urgent ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}
    >
      <strong>Free trial:</strong>{' '}
      {days === 0 ? 'Your trial expires today.' : `${days} day${days === 1 ? '' : 's'} remaining.`}{' '}
      Subscribe below to keep access after your trial ends.
    </div>
  )
}

function GraceBanner({ graceEndsAt }: { graceEndsAt: string }) {
  const days = daysUntil(graceEndsAt)
  if (days < 0) return null
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      <strong>Grace period:</strong> Your subscription was cancelled.{' '}
      {days === 0
        ? 'Access ends today.'
        : `Full access for ${days} more day${days === 1 ? '' : 's'}.`}{' '}
      Resubscribe below to keep your team&apos;s access.
    </div>
  )
}

function InactiveBanner() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <strong>Subscription required.</strong> Your trial or subscription has ended. Subscribe to
      restore access for your team.
    </div>
  )
}

function SuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      <div className="flex items-center justify-between">
        <span>
          <strong>Subscription initiated!</strong> It may take a few minutes to activate. Refresh
          this page shortly to see your updated status.
        </span>
        <button onClick={onDismiss} className="ml-4 text-green-600 hover:text-green-800">
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Subscribe modal ──────────────────────────────────────────────────────────

function TierCard({
  tier,
  price,
  features,
  selected,
  onClick,
}: {
  tier: string
  price: string
  features: string[]
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
        selected
          ? 'border-[var(--brand-primary)] bg-[#EEF3FF]'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading font-semibold text-[var(--text-primary)]">
            {PLAN_LABELS[tier] ?? tier}
          </p>
          <p className="text-sm font-bold text-[var(--brand-primary)]">{price}</p>
        </div>
        {selected && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)]">
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path
                d="M10 3L5 8.5 2 5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {features.map((f) => (
          <li key={f} className="text-xs text-gray-500">
            · {f}
          </li>
        ))}
      </ul>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [org, setOrg] = useState<OrgBillingData | null>(null)
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null)
  const [role, setRole] = useState<string>('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showSuccess, setShowSuccess] = useState(searchParams.get('status') === 'success')
  const [showCancelledNotice] = useState(searchParams.get('status') === 'cancelled')

  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'starter' | 'growth'>('starter')
  const [showTierPicker, setShowTierPicker] = useState(false)

  // Clear status query param after reading it
  useEffect(() => {
    if (searchParams.get('status')) {
      router.replace('/settings/billing', { scroll: false })
    }
  }, [router, searchParams])

  const loadBilling = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, invoicesRes] = await Promise.all([
        fetch('/api/billing/status'),
        fetch('/api/billing/invoices').catch(() => null),
      ])

      if (!statusRes.ok) {
        setError('Failed to load billing information.')
        return
      }

      const statusData = (await statusRes.json()) as {
        data: { org: OrgBillingData; seatUsage: SeatUsage; role: string }
      }
      setOrg(statusData.data.org)
      setSeatUsage(statusData.data.seatUsage)
      setRole(statusData.data.role)

      if (invoicesRes?.ok) {
        const invData = (await invoicesRes.json()) as { data: { invoices: Invoice[] } }
        setInvoices(invData.data.invoices)
      }
    } catch {
      setError('Failed to load billing information.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBilling()
  }, [loadBilling])

  const handleSubscribe = async (tier: 'starter' | 'growth') => {
    setSubscribing(true)
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = (await res.json()) as {
        data?: { approvalUrl: string }
        error?: { message: string }
      }
      if (!res.ok || !data.data?.approvalUrl) {
        alert(data.error?.message ?? 'Failed to initiate subscription. Please try again.')
        return
      }
      window.location.href = data.data.approvalUrl
    } finally {
      setSubscribing(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setShowCancelConfirm(false)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (!res.ok) {
        alert('Failed to cancel subscription. Please try again.')
        return
      }
      await loadBilling()
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-red-600">{error ?? 'Unable to load billing.'}</p>
        <button
          onClick={() => void loadBilling()}
          className="mt-3 text-sm text-[var(--brand-primary)] hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const isOrgAdmin = role === 'org_admin' || role === 'super_admin'
  const status = org.subscription_status
  const canSubscribe =
    isOrgAdmin &&
    (status === 'trial' || status === 'inactive' || status === 'expired' || status === 'grace')
  const canUpgrade = isOrgAdmin && status === 'active' && org.subscription_tier === 'starter'
  const canCancel = isOrgAdmin && status === 'active' && !!org.paypal_subscription_id

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">{org.display_name}</p>
      </div>

      {/* Status banners */}
      {showSuccess && <SuccessBanner onDismiss={() => setShowSuccess(false)} />}
      {showCancelledNotice && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Subscription checkout was cancelled. No changes were made.
        </div>
      )}
      {status === 'trial' && org.trial_ends_at && <TrialBanner trialEndsAt={org.trial_ends_at} />}
      {status === 'grace' && org.grace_period_ends_at && (
        <GraceBanner graceEndsAt={org.grace_period_ends_at} />
      )}
      {(status === 'inactive' || status === 'expired') && <InactiveBanner />}

      {/* Plan card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Current Plan
            </p>
            <p className="mt-1 font-heading text-xl font-bold text-[var(--text-primary)]">
              {PLAN_LABELS[org.subscription_tier] ?? org.subscription_tier}
              {status === 'trial' && (
                <span className="ml-2 text-sm font-normal text-gray-400">(Free Trial)</span>
              )}
            </p>
            {status === 'active' && (
              <p className="text-sm text-gray-500">{PLAN_PRICES[org.subscription_tier]}</p>
            )}
          </div>
          {statusBadge(status)}
        </div>

        {status === 'active' && org.subscription_expires_at && (
          <p className="mt-2 text-sm text-gray-500">
            Renews {formatDate(org.subscription_expires_at)}
          </p>
        )}
        {status === 'trial' && org.trial_ends_at && (
          <p className="mt-2 text-sm text-gray-500">Trial ends {formatDate(org.trial_ends_at)}</p>
        )}

        {(canSubscribe || canUpgrade) && isOrgAdmin && (
          <div className="mt-4 space-y-2">
            {!showTierPicker && (
              <Button
                size="sm"
                onClick={() => {
                  if (canUpgrade) {
                    void handleSubscribe('growth')
                  } else {
                    setShowTierPicker(true)
                  }
                }}
                disabled={subscribing}
              >
                {subscribing
                  ? 'Redirecting to PayPal…'
                  : canUpgrade
                    ? 'Upgrade to Growth — $39.99/mo'
                    : 'Subscribe now'}
              </Button>
            )}

            {showTierPicker && !canUpgrade && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">Choose a plan:</p>
                <div className="grid grid-cols-2 gap-3">
                  <TierCard
                    tier="starter"
                    price="$19.99/mo"
                    features={['5 rooms', '1 admin', '100 users']}
                    selected={selectedTier === 'starter'}
                    onClick={() => setSelectedTier('starter')}
                  />
                  <TierCard
                    tier="growth"
                    price="$39.99/mo"
                    features={['20 rooms', '3 admins', 'Unlimited users']}
                    selected={selectedTier === 'growth'}
                    onClick={() => setSelectedTier('growth')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleSubscribe(selectedTier)}
                    disabled={subscribing}
                  >
                    {subscribing
                      ? 'Redirecting to PayPal…'
                      : `Subscribe — ${PLAN_PRICES[selectedTier]}`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTierPicker(false)}
                    disabled={subscribing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {canCancel && !showCancelConfirm && (
          <div className="mt-4">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-gray-400 hover:text-red-600 hover:underline"
            >
              Cancel subscription
            </button>
          </div>
        )}

        {showCancelConfirm && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              <strong>Cancel subscription?</strong> Your team will have a 5-day grace period, then
              lose access. Your data will be preserved.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel subscription'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                Keep subscription
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Seat usage */}
      {seatUsage && (status === 'active' || status === 'trial' || status === 'grace') && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
            Seat usage
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Rooms</p>
              <UsageBar current={seatUsage.rooms.current} limit={seatUsage.rooms.limit} />
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Admins</p>
              <UsageBar current={seatUsage.admins.current} limit={seatUsage.admins.limit} />
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Users</p>
              <UsageBar current={seatUsage.users.current} limit={seatUsage.users.limit} />
            </div>
          </div>
        </div>
      )}

      {/* Invoice history */}
      {isOrgAdmin && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
            Invoice history
          </h2>
          {invoices.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-600">{formatDate(inv.created_at)}</td>
                      <td className="py-3 pr-4 capitalize text-gray-700">{inv.tier}</td>
                      <td className="py-3 pr-4 font-medium text-gray-700">
                        ${Number(inv.amount_usd).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        {formatDate(inv.billing_period_start)} –{' '}
                        {formatDate(inv.billing_period_end)}
                      </td>
                      <td className="py-3">
                        {inv.downloadUrl ? (
                          <a
                            href={inv.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--brand-primary)] hover:underline"
                          >
                            PDF
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
