'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Building2, User, CalendarDays, Globe } from 'lucide-react'
import { format } from 'date-fns'

interface SearchReservation {
  id: string
  title: string
  start_time: string
  status: string
  room_name: string | null
  org_name: string | null
}
interface SearchRoom {
  id: string
  name: string
  capacity: number | null
  status: string
  org_name: string | null
}
interface SearchUser {
  id: string
  full_name: string | null
  email: string | null
  role: string
  org_name: string | null
}
interface SearchResults {
  reservations: SearchReservation[]
  rooms: SearchRoom[]
  users: SearchUser[]
}

interface GlobalSearchProps {
  isSuperAdmin?: boolean
}

export default function GlobalSearch({ isSuperAdmin = false }: GlobalSearchProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [orgFilter, setOrgFilter] = useState('')
  const [orgOptions, setOrgOptions] = useState<{ id: string; display_name: string }[]>([])
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isSuperAdmin) return
    void fetch('/api/super-admin/orgs?page=1')
      .then((r) => r.json())
      .then((j: { success: boolean; data: { orgs: { id: string; display_name: string }[] } }) => {
        if (j.success) setOrgOptions(j.data.orgs ?? [])
      })
  }, [isSuperAdmin])

  const total = results
    ? results.reservations.length + results.rooms.length + results.users.length
    : 0
  const hasResults = results !== null && total > 0

  const doSearch = useCallback(async (q: string, org: string) => {
    if (q.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q })
      if (org) params.set('org_id', org)
      const res = await fetch(`/api/search?${params}`)
      const json = (await res.json()) as { success: boolean; data: SearchResults }
      if (json.success) setResults(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void doSearch(query, orgFilter), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, orgFilter, doSearch])

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openSearch = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const close = () => {
    setOpen(false)
    setQuery('')
    setResults(null)
  }

  const navigate = (url: string) => {
    close()
    router.push(url)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-300 hover:bg-white transition-colors"
        aria-label="Search (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline ml-1 rounded border border-gray-200 bg-white px-1 text-[10px] text-gray-400">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4">
          <div
            className="absolute inset-0 bg-black/30"
            role="button"
            tabIndex={-1}
            aria-label="Close search"
            onClick={close}
            onKeyDown={(e) => e.key === 'Escape' && close()}
          />
          <div
            ref={containerRef}
            className="relative w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reservations, rooms, users…"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              {isSuperAdmin && orgOptions.length > 0 && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 bg-white max-w-[140px]"
                  >
                    <option value="">All orgs</option>
                    {orgOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    setResults(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading && <p className="py-8 text-center text-sm text-gray-400">Searching…</p>}

              {!loading && query.length >= 2 && !hasResults && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}

              {!loading && !query && (
                <p className="py-8 text-center text-sm text-gray-400">Start typing to search…</p>
              )}

              {!loading && hasResults && (
                <div className="py-1">
                  {results!.reservations.length > 0 && (
                    <section>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" /> Reservations
                      </p>
                      {results!.reservations.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => navigate('/calendar')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-start gap-3"
                        >
                          <CalendarDays className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                            <p className="text-xs text-gray-500">
                              {r.room_name ?? 'Unknown room'} ·{' '}
                              {format(new Date(r.start_time), 'MMM d, yyyy')}
                              {r.org_name ? ` · ${r.org_name}` : ''}
                            </p>
                          </div>
                          <span
                            className={`ml-auto shrink-0 text-[10px] rounded-full px-2 py-0.5 font-medium ${
                              r.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : r.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </button>
                      ))}
                    </section>
                  )}

                  {results!.rooms.length > 0 && (
                    <section>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" /> Rooms
                      </p>
                      {results!.rooms.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => navigate('/org-admin/rooms')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-500">
                              {r.capacity ? `Capacity ${r.capacity}` : 'No capacity set'}
                              {r.org_name ? ` · ${r.org_name}` : ''}
                            </p>
                          </div>
                          <span
                            className={`ml-auto shrink-0 text-[10px] rounded-full px-2 py-0.5 font-medium ${
                              r.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </button>
                      ))}
                    </section>
                  )}

                  {results!.users.length > 0 && (
                    <section>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                        <User className="h-3 w-3" /> Users
                      </p>
                      {results!.users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => navigate('/org-admin/users')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <User className="h-4 w-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {u.full_name ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {u.email ?? ''}
                              {u.org_name ? ` · ${u.org_name}` : ''}
                            </p>
                          </div>
                          <span className="ml-auto shrink-0 text-[10px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 font-medium">
                            {u.role}
                          </span>
                        </button>
                      ))}
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t px-4 py-2 flex items-center justify-between">
              <p className="text-[11px] text-gray-400">Press Esc to close</p>
              {hasResults && (
                <p className="text-[11px] text-gray-400">
                  {total} result{total !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
