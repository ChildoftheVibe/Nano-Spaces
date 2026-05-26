'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ActivityEntry {
  id: string
  action: string
  actor_name: string
  actor_id: string | null
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (actionFilter) params.set('action', actionFilter)
      if (fromFilter) params.set('from', fromFilter)
      if (toFilter) params.set('to', toFilter + 'T23:59:59Z')
      const res = await fetch(`/api/org/activity-log?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { entries: ActivityEntry[]; total: number }
      }
      if (json.success) {
        setEntries(json.data.entries)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, fromFilter, toFilter])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-[#4F7EFA]" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Activity Log</h1>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          {total} entries
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.04] p-4">
        <div className="min-w-[160px] flex-1">
          <Label className="text-xs text-gray-600 dark:text-white/60">Action contains</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            placeholder="e.g. reservation"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600 dark:text-white/60">From</Label>
          <Input
            type="date"
            className="mt-1 h-8 text-sm"
            value={fromFilter}
            onChange={(e) => {
              setFromFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">To</Label>
          <Input
            type="date"
            className="mt-1 h-8 text-sm"
            value={toFilter}
            onChange={(e) => {
              setToFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActionFilter('')
              setFromFilter('')
              setToFilter('')
              setPage(1)
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No activity found.</div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-[#12131A]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/45">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/45">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/45">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/45">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/45">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-white/45">
                      {format(new Date(e.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-white/70">
                      {e.actor_name}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 dark:bg-white/[0.07] px-1.5 py-0.5 text-xs text-gray-700 dark:text-white/70">
                        {e.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-white/45">
                      {e.target_type ?? '—'}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-xs text-gray-500 dark:text-white/45">
                      {e.details ? JSON.stringify(e.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-white/45">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-xs text-gray-400 dark:text-white/30">
        Read-only. The activity log is append-only and cannot be modified.
      </p>
    </div>
  )
}
