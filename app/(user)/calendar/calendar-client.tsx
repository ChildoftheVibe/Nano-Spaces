'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg, DatesSetArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import { fromZonedTime } from 'date-fns-tz'
import { createEvent, createEvents } from 'ics'
import type { EventAttributes } from 'ics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string
  name: string
  type: 'room' | 'building'
  capacity: number | null
  min_notice_hours: number
  cancel_notice_hours: number
  max_advance_days: number
  max_booking_duration_mins: number | null
  nano_buffer_mins: number
  approval_required: boolean
}

interface CalReservation {
  id: string
  title: string
  notes: string | null
  location_id: string
  room_name: string
  booked_by: string | null
  booker_name: string
  start_time: string
  end_time: string
  status: string
  is_mine: boolean
  nano_buffer_mins: number
}

interface BlackoutDate {
  id: string
  title: string
  location_id: string | null
  start_time: string
  end_time: string
}

interface MaintenanceWindow {
  id: string
  room_name: string
  maintenance_from: string
  maintenance_to: string
  maintenance_note: string | null
}

type View = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

type ModalState =
  | { type: 'none' }
  | { type: 'new'; date?: string; startTime?: string; prefill?: Partial<BookingFormData> }
  | { type: 'view'; reservation: CalReservation }

// ─── Booking form schema ───────────────────────────────────────────────────────

const bookingSchema = z
  .object({
    location_id: z.string().min(1, 'Select a room'),
    title: z.string().min(1, 'Title is required').max(200),
    notes: z.string().max(1000).optional(),
    date: z.string().min(1, 'Date is required'),
    start_time_local: z.string().min(1, 'Start time is required'),
    end_time_local: z.string().min(1, 'End time is required'),
  })
  .refine((d) => d.end_time_local > d.start_time_local, {
    message: 'End time must be after start time',
    path: ['end_time_local'],
  })

type BookingFormData = z.infer<typeof bookingSchema>

// ─── ICS helpers ──────────────────────────────────────────────────────────────

function toDateArray(iso: string): [number, number, number, number, number] {
  const d = new Date(iso)
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ]
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildIcsAttrs(r: CalReservation): EventAttributes {
  return {
    title: r.title,
    start: toDateArray(r.start_time),
    startInputType: 'utc',
    end: toDateArray(r.end_time),
    endInputType: 'utc',
    location: r.room_name,
    ...(r.notes != null ? { description: r.notes } : {}),
    organizer: { name: 'Nano Spaces', email: 'noreply@nanospaces.app' },
  }
}

function downloadSingleIcs(r: CalReservation) {
  createEvent(buildIcsAttrs(r), (err, value) => {
    if (!err) triggerDownload(`booking-${r.id.slice(0, 8)}.ics`, value)
  })
}

function downloadBulkIcs(reservations: CalReservation[]) {
  const attrs: EventAttributes[] = reservations.map(buildIcsAttrs)
  createEvents(attrs, (err, value) => {
    if (!err) triggerDownload('nano-spaces-bookings.ics', value)
  })
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-blue-50 text-blue-700',
    pending: 'bg-yellow-50 text-yellow-700',
    flagged: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  const cls = styles[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── New Booking Modal ────────────────────────────────────────────────────────

function NewBookingModal({
  rooms,
  userTimezone,
  defaultDate,
  defaultStartTime,
  prefill,
  onClose,
  onBooked,
}: {
  rooms: Room[]
  userTimezone: string
  defaultDate?: string
  defaultStartTime?: string
  prefill?: Partial<BookingFormData>
  onClose: () => void
  onBooked: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      location_id: prefill?.location_id ?? '',
      title: prefill?.title ?? '',
      notes: prefill?.notes ?? '',
      date: prefill?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
      start_time_local: prefill?.start_time_local ?? defaultStartTime ?? '09:00',
      end_time_local: prefill?.end_time_local ?? '10:00',
    },
  })

  const selectedRoomId = watch('location_id')
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  const onSubmit = async (data: BookingFormData) => {
    const startIso = fromZonedTime(
      new Date(`${data.date}T${data.start_time_local}`),
      userTimezone,
    ).toISOString()
    const endIso = fromZonedTime(
      new Date(`${data.date}T${data.end_time_local}`),
      userTimezone,
    ).toISOString()

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: data.location_id,
        title: data.title,
        notes: data.notes || undefined,
        start_time: startIso,
        end_time: endIso,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = (json as { error?: { message?: string } }).error?.message ?? 'Booking failed.'
      setError('root', { message: msg })
      return
    }

    onBooked()
  }

  return (
    <ModalShell title="New Booking" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        {selectedRoom?.min_notice_hours && (
          <div className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
            Bookings require {selectedRoom.min_notice_hours}h advance notice. Cancellations also
            require {selectedRoom.cancel_notice_hours}h.
          </div>
        )}
        {!selectedRoomId && (
          <div className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
            Select a room to see booking requirements.
          </div>
        )}

        <div>
          <Label htmlFor="nb-room">Room *</Label>
          <select
            id="nb-room"
            {...register('location_id')}
            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="">Select a room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.capacity ? ` (cap. ${r.capacity})` : ''}
                {r.approval_required ? ' — requires approval' : ''}
              </option>
            ))}
          </select>
          {errors.location_id && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.location_id.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="nb-title">Title *</Label>
          <Input id="nb-title" {...register('title')} placeholder="Team meeting" />
          {errors.title && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="nb-notes">Notes</Label>
          <textarea
            id="nb-notes"
            {...register('notes')}
            rows={2}
            maxLength={1000}
            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            placeholder="Optional notes…"
          />
        </div>

        <div>
          <Label htmlFor="nb-date">Date *</Label>
          <Input id="nb-date" type="date" {...register('date')} />
          {errors.date && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.date.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="nb-start">Start *</Label>
            <Input id="nb-start" type="time" {...register('start_time_local')} />
            {errors.start_time_local && (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {errors.start_time_local.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="nb-end">End *</Label>
            <Input id="nb-end" type="time" {...register('end_time_local')} />
            {errors.end_time_local && (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {errors.end_time_local.message}
              </p>
            )}
          </div>
        </div>

        {errors.root && <p className="text-sm text-[var(--color-danger)]">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Booking…' : 'Book'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

// ─── Reservation Detail Modal ─────────────────────────────────────────────────

function ReservationModal({
  reservation,
  onClose,
  onCancelled,
  onEdited,
  onCopy,
}: {
  reservation: CalReservation
  onClose: () => void
  onCancelled: () => void
  onEdited: () => void
  onCopy: (r: CalReservation) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(reservation.title)
  const [editNotes, setEditNotes] = useState(reservation.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  const saveEdit = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, notes: editNotes || null }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Update failed.')
      setBusy(false)
      return
    }
    setBusy(false)
    setEditing(false)
    onEdited()
  }

  const cancel = async () => {
    if (!confirm('Cancel this booking?')) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Cancellation failed.')
      setBusy(false)
      return
    }
    onCancelled()
  }

  const canEdit = reservation.is_mine && ['pending', 'confirmed'].includes(reservation.status)
  const canCancel = reservation.is_mine && ['pending', 'confirmed'].includes(reservation.status)

  return (
    <ModalShell title="Booking Details" onClose={onClose}>
      <div className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveEdit()} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-[var(--text-primary)]">
                  {reservation.title}
                </h3>
                <StatusBadge status={reservation.status} />
              </div>
              <p className="text-sm text-gray-600">🚪 {reservation.room_name}</p>
              <p className="text-sm text-gray-600">
                🕐 {formatTime(reservation.start_time)} — {formatTime(reservation.end_time)}
              </p>
              <p className="text-sm text-gray-600">👤 {reservation.booker_name}</p>
              {reservation.notes && (
                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {reservation.notes}
                </p>
              )}
            </div>

            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

            <div className="flex flex-wrap gap-2 pt-2">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[var(--color-danger)]"
                  disabled={busy}
                  onClick={() => void cancel()}
                >
                  {busy ? 'Cancelling…' : 'Cancel Booking'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => downloadSingleIcs(reservation)}>
                <Download className="mr-1 h-3 w-3" />
                Add to Calendar
              </Button>
              {reservation.is_mine && (
                <Button size="sm" variant="ghost" onClick={() => onCopy(reservation)}>
                  Copy Booking
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}

// ─── Main Calendar Client ─────────────────────────────────────────────────────

export default function CalendarClient() {
  const calendarRef = useRef<FullCalendar>(null)
  const [userTimezone, setUserTimezone] = useState('UTC')
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [currentView, setCurrentView] = useState<View>('dayGridMonth')
  const [viewTitle, setViewTitle] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [toast, setToast] = useState<string | null>(null)
  const [upcomingReservations, setUpcomingReservations] = useState<CalReservation[]>([])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // Initial data load
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    setCurrentView(isMobile ? 'timeGridWeek' : 'dayGridMonth')

    Promise.all([
      fetch('/api/user/profile').then((r) => r.json()),
      fetch('/api/calendar/rooms').then((r) => r.json()),
    ]).then(([profileJson, roomsJson]) => {
      const tz =
        (profileJson as { data?: { profile?: { timezone?: string } } }).data?.profile?.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone
      setUserTimezone(tz)
      setRooms((roomsJson as { data?: { rooms?: Room[] } }).data?.rooms ?? [])
    })
  }, [])

  // Fetch upcoming reservations (for bulk ICS export)
  const fetchUpcoming = useCallback(async () => {
    const start = new Date().toISOString()
    const end = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(`/api/reservations?start=${start}&end=${end}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      const all = (json as { data?: { reservations?: CalReservation[] } }).data?.reservations ?? []
      setUpcomingReservations(all.filter((r) => r.is_mine))
    }
  }, [])

  useEffect(() => {
    void fetchUpcoming()
  }, [fetchUpcoming])

  // FullCalendar events source
  const fetchCalendarEvents = useCallback(
    async (
      info: { start: Date; end: Date },
      successCallback: (events: EventInput[]) => void,
      failureCallback: (error: Error) => void,
    ) => {
      try {
        const params = new URLSearchParams({
          start: info.start.toISOString(),
          end: info.end.toISOString(),
        })
        const res = await fetch(`/api/reservations?${params.toString()}`)
        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          failureCallback(new Error('Failed to load events'))
          return
        }

        const data = (
          json as {
            data?: {
              reservations?: CalReservation[]
              blackouts?: BlackoutDate[]
              maintenanceWindows?: MaintenanceWindow[]
            }
          }
        ).data

        const events: EventInput[] = []

        for (const r of data?.reservations ?? []) {
          if (selectedRoom && r.location_id !== selectedRoom) continue

          const isMine = r.is_mine
          const isBlocked = r.status === 'flagged'
          let className = isMine ? 'event-mine' : 'event-confirmed'
          if (isBlocked) className = 'event-blocked'

          events.push({
            id: r.id,
            title: r.title,
            start: r.start_time,
            end: r.end_time,
            classNames: [className],
            extendedProps: { type: 'reservation', reservation: r },
          })

          // Buffer zone after reservation
          if (r.nano_buffer_mins > 0) {
            const bufEnd = new Date(
              new Date(r.end_time).getTime() + r.nano_buffer_mins * 60 * 1000,
            ).toISOString()
            events.push({
              id: `buffer-${r.id}`,
              start: r.end_time,
              end: bufEnd,
              display: 'background',
              backgroundColor: '#E5E7EB',
              classNames: ['event-buffer'],
              overlap: false,
              editable: false,
              extendedProps: { type: 'buffer' },
            })
          }
        }

        for (const b of data?.blackouts ?? []) {
          if (selectedRoom && b.location_id && b.location_id !== selectedRoom) continue
          events.push({
            id: `blackout-${b.id}`,
            title: `🔒 ${b.title}`,
            start: b.start_time,
            end: b.end_time,
            classNames: ['event-blocked'],
            display: 'background',
            overlap: false,
            editable: false,
            extendedProps: { type: 'blackout' },
          })
        }

        for (const m of data?.maintenanceWindows ?? []) {
          events.push({
            id: `maint-${m.id}`,
            title: `🔧 ${m.room_name}${m.maintenance_note ? `: ${m.maintenance_note}` : ''}`,
            start: m.maintenance_from,
            end: m.maintenance_to,
            classNames: ['event-blocked'],
            display: 'background',
            overlap: false,
            editable: false,
            extendedProps: { type: 'maintenance' },
          })
        }

        successCallback(events)
      } catch (e) {
        failureCallback(e instanceof Error ? e : new Error('Unknown error'))
      }
    },
    [selectedRoom],
  )

  const handleDateClick = (info: DateClickArg) => {
    if (info.view.type === 'dayGridMonth') {
      // Clicked a day in month view — switch to week view on that day
      calendarRef.current?.getApi().gotoDate(info.date)
      calendarRef.current?.getApi().changeView('timeGridWeek')
      setCurrentView('timeGridWeek')
      return
    }
    const date = info.date
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    const startTime = `${pad(date.getHours())}:${pad(date.getMinutes())}`
    const endHour = date.getHours() + 1
    const endTime = `${pad(endHour > 23 ? 23 : endHour)}:${pad(date.getMinutes())}`
    setModal({
      type: 'new',
      date: dateStr,
      startTime,
      prefill: { start_time_local: startTime, end_time_local: endTime },
    })
  }

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps
    if (props['type'] === 'reservation') {
      setModal({ type: 'view', reservation: props['reservation'] as CalReservation })
    }
  }

  const handleDatesSet = (info: DatesSetArg) => {
    setViewTitle(info.view.title)
    setCurrentView(info.view.type as View)
  }

  const changeView = (v: View) => {
    calendarRef.current?.getApi().changeView(v)
    setCurrentView(v)
  }

  const handleBooked = () => {
    setModal({ type: 'none' })
    showToast('Booking created.')
    calendarRef.current?.getApi().refetchEvents()
    void fetchUpcoming()
  }

  const handleCancelled = () => {
    setModal({ type: 'none' })
    showToast('Booking cancelled.')
    calendarRef.current?.getApi().refetchEvents()
    void fetchUpcoming()
  }

  const handleEdited = () => {
    showToast('Booking updated.')
    calendarRef.current?.getApi().refetchEvents()
    void fetchUpcoming()
  }

  const handleCopy = (r: CalReservation) => {
    setModal({
      type: 'new',
      prefill: {
        location_id: r.location_id,
        title: r.title,
        notes: r.notes ?? '',
      },
    })
  }

  const VIEW_LABELS: Record<View, string> = {
    dayGridMonth: 'Month',
    timeGridWeek: 'Week',
    timeGridDay: 'Day',
  }

  return (
    <>
      <style>{`
        .fc { font-family: Inter, sans-serif; font-size: 14px; }
        .fc-toolbar-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 700; }
        .fc-col-header-cell { background: #EFF1F5; text-transform: uppercase; font-size: 12px; letter-spacing: 0.04em; }
        .fc-day-today { background: #EEF3FF !important; }
        .fc-day-today .fc-daygrid-day-number { background: #4F7EFA; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
        .fc-event { border-radius: 6px; border: none; padding: 3px 7px; font-size: 12px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
        .event-confirmed { background: #EEF3FF !important; color: #2D5DD6 !important; }
        .event-mine { background: #4F7EFA !important; color: #fff !important; }
        .event-blocked { background: #FEF2F2 !important; color: #F0544F !important; cursor: not-allowed !important; }
        .event-buffer { opacity: 0.5; }
        .fc-timegrid-slot { cursor: pointer; }
        .fc-daygrid-day:hover { background: #F5F7FF; }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().prev()}
              className="rounded-lg border p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-[var(--text-primary)]"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[200px] text-center font-heading text-lg font-bold text-[var(--text-primary)]">
              {viewTitle}
            </h2>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().next()}
              className="rounded-lg border p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-[var(--text-primary)]"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().today()}
              className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex rounded-lg border bg-white overflow-hidden">
              {(['dayGridMonth', 'timeGridWeek', 'timeGridDay'] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    currentView === v
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>

            {/* Room filter */}
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value)
                setTimeout(() => calendarRef.current?.getApi().refetchEvents(), 0)
              }}
              className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="">All rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Export upcoming */}
            {upcomingReservations.length > 0 && (
              <button
                type="button"
                onClick={() => downloadBulkIcs(upcomingReservations)}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                title="Export all upcoming bookings"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            )}

            {/* New booking */}
            {toast && <p className="text-sm text-gray-600">{toast}</p>}
            <Button onClick={() => setModal({ type: 'new' })} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Book
            </Button>
          </div>
        </div>

        {/* FullCalendar */}
        <div className="rounded-xl border bg-white p-2 shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            timeZone={userTimezone}
            headerToolbar={false}
            height="auto"
            contentHeight={620}
            events={fetchCalendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            nowIndicator
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            dayMaxEvents={3}
          />
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#4F7EFA]" /> My booking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#EEF3FF]" /> Others
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FEF2F2]" /> Blocked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#E5E7EB]" /> Buffer
          </span>
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'new' && (
        <NewBookingModal
          rooms={rooms}
          userTimezone={userTimezone}
          {...(modal.date !== undefined ? { defaultDate: modal.date } : {})}
          {...(modal.startTime !== undefined ? { defaultStartTime: modal.startTime } : {})}
          {...(modal.prefill !== undefined ? { prefill: modal.prefill } : {})}
          onClose={() => setModal({ type: 'none' })}
          onBooked={handleBooked}
        />
      )}
      {modal.type === 'view' && (
        <ReservationModal
          reservation={modal.reservation}
          onClose={() => setModal({ type: 'none' })}
          onCancelled={handleCancelled}
          onEdited={handleEdited}
          onCopy={handleCopy}
        />
      )}
    </>
  )
}
