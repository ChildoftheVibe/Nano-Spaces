'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'

interface ReservationInfo {
  id: string
  title: string
  room_name: string
  start_time: string
  end_time: string
  status: string
  checked_in: boolean
  is_mine: boolean
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function CheckInContent() {
  const searchParams = useSearchParams()
  const reservationId = searchParams.get('reservation_id')

  const [reservation, setReservation] = useState<ReservationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedIn, setCheckedIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reservationId) {
      setLoading(false)
      return
    }

    // Fetch reservation from the reservations API
    const now = new Date()
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    fetch(`/api/reservations?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then((r) => r.json())
      .then((json: unknown) => {
        const all =
          (json as { data?: { reservations?: ReservationInfo[] } }).data?.reservations ?? []
        const found = all.find((r) => r.id === reservationId)
        if (found) {
          setReservation(found)
          setCheckedIn(found.checked_in)
        } else {
          setError('Reservation not found or you are not authorized to view it.')
        }
      })
      .catch(() => setError('Failed to load reservation. Please make sure you are logged in.'))
      .finally(() => setLoading(false))
  }, [reservationId])

  const handleCheckIn = async () => {
    if (!reservationId) return
    setBusy(true)
    setError(null)

    const res = await fetch(`/api/reservations/${reservationId}/checkin`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))

    if (res.ok) {
      setCheckedIn(true)
    } else {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Check-in failed.')
    }
    setBusy(false)
  }

  if (!reservationId) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">No reservation ID provided.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-center text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F7EFA]" />
        <p>Loading reservation…</p>
      </div>
    )
  }

  if (error && !reservation) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <Button
          variant="outline"
          onClick={() =>
            (window.location.href = '/login?next=/checkin?reservation_id=' + reservationId)
          }
        >
          Sign in to Check In
        </Button>
      </div>
    )
  }

  if (!reservation) return null

  if (checkedIn) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="font-heading text-xl font-bold text-gray-900">Checked In!</h2>
        <p className="text-gray-500">You&apos;re all set. Enjoy your booking.</p>
        <div className="mt-2 w-full rounded-xl bg-gray-50 p-4 text-left text-sm">
          <p className="font-medium text-gray-900">{reservation.title}</p>
          <p className="mt-1 text-gray-500">{reservation.room_name}</p>
          <p className="mt-1 text-gray-500">{formatDateTime(reservation.start_time)}</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const startTime = new Date(reservation.start_time)
  const endTime = new Date(reservation.end_time)
  const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000)
  const canCheckIn = now >= tenMinBefore && now <= endTime && reservation.status === 'confirmed'
  const minutesUntilOpen = Math.ceil((tenMinBefore.getTime() - now.getTime()) / 60000)

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl bg-gray-50 p-5 text-sm">
        <h2 className="font-heading text-lg font-semibold text-gray-900">{reservation.title}</h2>
        <p className="mt-2 text-gray-600">📍 {reservation.room_name}</p>
        <p className="mt-1 text-gray-600">
          <span className="text-gray-400">Start:</span> {formatDateTime(reservation.start_time)}
        </p>
        <p className="mt-1 text-gray-600">
          <span className="text-gray-400">End:</span> {formatDateTime(reservation.end_time)}
        </p>
      </div>

      {reservation.status !== 'confirmed' && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This booking is not yet confirmed.
        </div>
      )}

      {reservation.status === 'confirmed' && !canCheckIn && minutesUntilOpen > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Clock className="h-4 w-4 shrink-0" />
          Check-in opens in {minutesUntilOpen} minute{minutesUntilOpen !== 1 ? 's' : ''}.
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {canCheckIn && (
        <Button
          className="w-full py-6 text-base font-semibold"
          onClick={() => void handleCheckIn()}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking in…
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Check In Now
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export default function CheckInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-xl font-bold text-[#1A1D23]">
            <span className="text-[#4F7EFA]">Nano</span> Check-In
          </h1>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#4F7EFA]" />
            </div>
          }
        >
          <CheckInContent />
        </Suspense>
      </div>
    </div>
  )
}
