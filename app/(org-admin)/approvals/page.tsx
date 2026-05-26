'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'

interface PendingReservation {
  id: string
  title: string
  notes: string | null
  room_name: string
  booker_name: string
  start_time: string
  end_time: string
  status: string
  recurring_group_id: string | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function RejectDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#12131A] dark:ring-1 dark:ring-white/[0.09] p-6 shadow-xl">
        <h3 className="mb-3 font-heading text-base font-semibold text-gray-900 dark:text-white">
          Reject Booking
        </h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-md border border-gray-200 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/80 dark:placeholder:text-white/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => onConfirm(reason)}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const [reservations, setReservations] = useState<PendingReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const end = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    const res = await fetch(`/api/reservations?start=${now.toISOString()}&end=${end.toISOString()}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      const all =
        (
          json as {
            data?: {
              reservations?: PendingReservation[]
            }
          }
        ).data?.reservations ?? []
      setReservations(all.filter((r) => r.status === 'pending'))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  const approve = async (id: string) => {
    setBusy(id)
    const res = await fetch(`/api/reservations/${id}/approve`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      showToast('Booking approved.')
      setReservations((prev) => prev.filter((r) => r.id !== id))
    } else {
      showToast((json as { error?: { message?: string } }).error?.message ?? 'Failed to approve.')
    }
    setBusy(null)
  }

  const reject = async (id: string, reason: string) => {
    setRejectTarget(null)
    setBusy(id)
    const res = await fetch(`/api/reservations/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || undefined }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      showToast('Booking rejected.')
      setReservations((prev) => prev.filter((r) => r.id !== id))
    } else {
      showToast((json as { error?: { message?: string } }).error?.message ?? 'Failed to reject.')
    }
    setBusy(null)
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">
            Pending Approvals
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/45">
            Review and approve or reject booking requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {toast && <span className="text-sm text-gray-600 dark:text-white/60">{toast}</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchPending()}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] py-16 text-center">
          <CheckCircle className="h-10 w-10 text-green-400" />
          <p className="font-medium text-gray-600 dark:text-white/60">No pending approvals</p>
          <p className="text-sm text-gray-400 dark:text-white/35">
            All booking requests have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-yellow-200 dark:border-yellow-500/25 bg-white dark:bg-[#12131A] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-semibold text-gray-900 dark:text-white">
                      {r.title}
                    </span>
                    {r.recurring_group_id && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Recurring
                      </span>
                    )}
                    <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 dark:text-white/60">
                    <p>
                      <span className="font-medium text-gray-700 dark:text-white/70">Room:</span>{' '}
                      {r.room_name}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-white/70">
                        Requested by:
                      </span>{' '}
                      {r.booker_name}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-white/70">Start:</span>{' '}
                      {formatDateTime(r.start_time)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-white/70">End:</span>{' '}
                      {formatDateTime(r.end_time)}
                    </p>
                    {r.notes && (
                      <p className="mt-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-500 dark:text-white/45">
                        {r.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    disabled={busy === r.id}
                    onClick={() => void approve(r.id)}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {busy === r.id ? 'Approving…' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={busy === r.id}
                    onClick={() => setRejectTarget(r.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectDialog
          onConfirm={(reason) => void reject(rejectTarget, reason)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
