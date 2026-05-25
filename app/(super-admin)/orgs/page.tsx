'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Building2, RefreshCw, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Org {
  id: string
  display_name: string | null
  name: string
  slug: string
  subscription_tier: string
  subscription_status: string
  trial_ends_at: string | null
  subscription_expires_at: string | null
  created_at: string
}

function AddOrgModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [orgName, setOrgName] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, adminFullName, adminEmail, adminPassword }),
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to create organization.')
        return
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Create Organization</h2>
        <p className="text-xs text-gray-500 mb-4">Creates the org and an admin user account.</p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="co-org" className="text-xs">
              Organization name
            </Label>
            <Input
              id="co-org"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Admin account</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="co-name" className="text-xs">
                  Full name
                </Label>
                <Input
                  id="co-name"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="co-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="co-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="co-pw" className="text-xs">
                  Password (min 12 chars)
                </Label>
                <Input
                  id="co-pw"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminOrgsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAddOrg, setShowAddOrg] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const LIMIT = 25

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = async (p = page, q = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/super-admin/orgs?${params}`)
      const json = (await res.json()) as { success: boolean; data: { orgs: Org[]; total: number } }
      if (json.success) {
        setOrgs(json.data.orgs)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(page, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => void load(1, val), 300)
  }

  const handlePage = (next: number) => {
    setPage(next)
    void load(next, search)
  }

  const statusColor = (s: string) =>
    s === 'active'
      ? 'bg-green-100 text-green-700'
      : s === 'trial'
        ? 'bg-blue-100 text-blue-700'
        : s === 'expired' || s === 'cancelled'
          ? 'bg-red-100 text-red-700'
          : s === 'grace'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600'

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900">All Organizations</h1>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load(page, search)}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Button size="sm" onClick={() => setShowAddOrg(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Org
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Organization', 'Tier', 'Status', 'Trial / Expires', 'Created'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgs.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/super-admin/orgs/${o.id}`)}
                    className="hover:bg-blue-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {o.display_name ?? o.name}
                      <p className="text-xs font-normal text-gray-400">{o.slug}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{o.subscription_tier}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(o.subscription_status)}`}
                      >
                        {o.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {o.trial_ends_at
                        ? `Trial ends ${format(new Date(o.trial_ends_at), 'MMM d, yyyy')}`
                        : o.subscription_expires_at
                          ? `Expires ${format(new Date(o.subscription_expires_at), 'MMM d, yyyy')}`
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(o.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orgs.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400">
                {search ? 'No organizations match your search.' : 'No organizations found.'}
              </p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page === 1}
                  className="rounded-md border p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-md border p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAddOrg && (
        <AddOrgModal
          onClose={() => setShowAddOrg(false)}
          onSuccess={() => {
            setShowAddOrg(false)
            showToast('Organization created.')
            void load(1, search)
          }}
        />
      )}
    </div>
  )
}
