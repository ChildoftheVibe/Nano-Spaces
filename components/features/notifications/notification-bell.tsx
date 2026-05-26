'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck, Calendar, AlertCircle, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  read_at: string | null
  action_url: string | null
  created_at: string
}

function NotifIcon({ type }: { type: string }) {
  if (type.startsWith('reservation') || type.startsWith('booking') || type === 'checkin')
    return <Calendar className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
  if (type.includes('waitlist') || type.includes('god_mode') || type.includes('approval'))
    return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
  return <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?page=${pg}`)
      const json = (await res.json()) as {
        success: boolean
        data: { notifications: Notification[]; unread: number; total: number }
      }
      if (json.success) {
        setNotifications((prev) =>
          pg === 1 ? json.data.notifications : [...prev, ...json.data.notifications],
        )
        setUnread(json.data.unread)
        setTotal(json.data.total)
        setPage(pg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll unread count every 30s
  useEffect(() => {
    void fetchNotifications(1)
    const id = setInterval(
      () =>
        void fetch('/api/notifications?page=1')
          .then((r) => r.json())
          .then((j: { success: boolean; data: { unread: number } }) => {
            if (j.success) setUnread(j.data.unread)
          }),
      30_000,
    )
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen((v) => !v)
    void fetchNotifications(1)
  }

  const markRead = async (n: Notification) => {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((v) => Math.max(0, v - 1))
    }
    setOpen(false)
    if (n.action_url) router.push(n.action_url)
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  const loadMore = () => void fetchNotifications(page + 1)

  const displayCount = Math.min(unread, 99)
  const hasMore = notifications.length < total

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        className="relative flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {displayCount}
            {unread > 99 ? '+' : ''}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-96 max-h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1 text-xs text-[#FA5D0C] hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 && !loading && (
              <p className="py-10 text-center text-sm text-gray-400">No notifications</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => void markRead(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${!n.read ? 'bg-blue-50/40' : ''}`}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug line-clamp-1 ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
                    >
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#FA5D0C] shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-2.5 text-xs text-[#FA5D0C] hover:underline disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
