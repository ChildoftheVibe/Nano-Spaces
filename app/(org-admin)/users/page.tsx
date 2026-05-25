'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton'

interface OrgUser {
  id: string
  full_name: string | null
  email: string
  role: string
  is_active: boolean
  hibernate_status: string
  totp_enabled: boolean
  two_fa_method: string | null
  created_at: string
  tos_accepted_at: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  resend_count: number
  revoked: boolean
  expires_at: string
  created_at: string
  last_sent_at: string | null
}

type Tab = 'active' | 'hibernated' | 'pending'

const ACTION_LABELS: Record<string, string> = {
  suspend: 'Suspend',
  unsuspend: 'Unsuspend',
  hibernate: 'Hibernate',
  wake: 'Wake',
  reset_2fa: 'Reset 2FA',
  force_logout: 'Force logout',
}

function UserRow({
  u,
  onAction,
  onRemove,
}: {
  u: OrgUser
  onAction: (id: string, action: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const actions: string[] = []
  if (u.is_active) actions.push('suspend')
  else actions.push('unsuspend')
  if (u.hibernate_status !== 'hibernated') actions.push('hibernate')
  else actions.push('wake')
  actions.push('reset_2fa', 'force_logout')

  const run = async (action: string) => {
    setShowMenu(false)
    setBusy(true)
    await onAction(u.id, action)
    setBusy(false)
  }

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">{u.full_name ?? '—'}</p>
        <p className="text-xs text-gray-500">{u.email}</p>
      </td>
      <td className="py-3 pr-4">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize">
          {u.role === 'org_admin' ? 'Admin' : 'Member'}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            !u.is_active
              ? 'bg-red-50 text-red-700'
              : u.hibernate_status === 'hibernated'
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-green-50 text-green-700'
          }`}
        >
          {!u.is_active
            ? 'Suspended'
            : u.hibernate_status === 'hibernated'
              ? 'Hibernated'
              : 'Active'}
        </span>
      </td>
      <td className="py-3 text-right">
        <div className="relative inline-block">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-500"
          >
            {busy ? '…' : '⋯'}
          </Button>
          {showMenu && (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg">
              {actions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => void run(a)}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {ACTION_LABELS[a] ?? a}
                </button>
              ))}
              <hr className="my-1" />
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  void onRemove(u.id)
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-danger)] hover:bg-red-50"
              >
                Remove user
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function InvitationRow({
  inv,
  onAction,
}: {
  inv: Invitation
  onAction: (id: string, action: 'resend' | 'revoke') => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const expired = new Date(inv.expires_at) < new Date()

  const run = async (action: 'resend' | 'revoke') => {
    setBusy(true)
    await onAction(inv.id, action)
    setBusy(false)
  }

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">{inv.email}</p>
        <p className="text-xs text-gray-400">
          {expired ? 'Expired' : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
        </p>
      </td>
      <td className="py-3 pr-4">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize">
          {inv.role === 'org_admin' ? 'Admin' : 'Member'}
        </span>
      </td>
      <td className="py-3 pr-4">
        {inv.revoked ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Revoked
          </span>
        ) : expired ? (
          <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Expired
          </span>
        ) : (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            Pending
          </span>
        )}
      </td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-2">
          {!inv.revoked && inv.resend_count < 3 && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void run('resend')}>
              Resend
            </Button>
          )}
          {!inv.revoked && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-[var(--color-danger)]"
              onClick={() => void run('revoke')}
            >
              Revoke
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [users, setUsers] = useState<OrgUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'org_admin'>('user')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Bulk CSV
  const csvRef = useRef<HTMLInputElement>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResults, setBulkResults] = useState<Array<{
    email: string
    status: string
    error?: string
  }> | null>(null)

  const fetchData = async () => {
    const [usersRes, invRes] = await Promise.all([
      fetch('/api/org/users').then((r) => r.json()),
      fetch('/api/invitations').then((r) => r.json()),
    ])
    if (usersRes.success) setUsers(usersRes.data.users ?? [])
    if (invRes.success) setInvitations(invRes.data.invitations ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleUserAction = async (id: string, action: string) => {
    const res = await fetch(`/api/org/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setStatusMsg(`Action "${action}" applied.`)
      await fetchData()
    } else {
      const json = await res.json().catch(() => ({}))
      setStatusMsg((json as { error?: { message?: string } }).error?.message ?? 'Action failed.')
    }
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this user? This cannot be undone.')) return
    const res = await fetch(`/api/org/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStatusMsg('User removed.')
      await fetchData()
    } else {
      setStatusMsg('Failed to remove user.')
    }
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const handleInvitationAction = async (id: string, action: 'resend' | 'revoke') => {
    const res = await fetch(`/api/invitations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      await fetchData()
    } else {
      const json = await res.json().catch(() => ({}))
      setStatusMsg((json as { error?: { message?: string } }).error?.message ?? 'Action failed.')
      setTimeout(() => setStatusMsg(null), 3000)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)

    const res = await fetch('/api/invitations/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })

    if (res.ok) {
      setInviteEmail('')
      setInviteRole('user')
      await fetchData()
      setTab('pending')
    } else {
      const json = await res.json().catch(() => ({}))
      setInviteError(
        (json as { error?: { message?: string } }).error?.message ?? 'Failed to send invitation.',
      )
    }
    setInviting(false)
  }

  const handleBulkCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkUploading(true)
    setBulkResults(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/invitations/bulk-csv', { method: 'POST', body: formData })
    const json = await res.json().catch(() => ({}))

    if (res.ok) {
      setBulkResults(
        (json as { data?: { results?: Array<{ email: string; status: string; error?: string }> } })
          .data?.results ?? [],
      )
      await fetchData()
    } else {
      setStatusMsg(
        (json as { error?: { message?: string } }).error?.message ?? 'Bulk upload failed.',
      )
      setTimeout(() => setStatusMsg(null), 4000)
    }
    setBulkUploading(false)
    if (csvRef.current) csvRef.current.value = ''
  }

  const activeUsers = users.filter((u) => u.is_active && u.hibernate_status !== 'hibernated')
  const hibernatedUsers = users.filter((u) => u.hibernate_status === 'hibernated')

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
        <SkeletonTable rows={6} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Users</h1>
        {statusMsg && <p className="text-sm text-gray-600">{statusMsg}</p>}
      </div>

      {/* Invite form */}
      <section className="mb-8 rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Invite a User</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">
              Email
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'user' | 'org_admin')}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="user">Member</option>
            <option value="org_admin">Admin</option>
          </select>
          <Button onClick={() => void sendInvite()} disabled={inviting || !inviteEmail.trim()}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </Button>
        </div>
        {inviteError && <p className="mt-2 text-xs text-[var(--color-danger)]">{inviteError}</p>}

        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-sm text-gray-500">
            Or bulk invite via CSV (email, role columns — max 100 rows):
          </p>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleBulkCsv(e)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => csvRef.current?.click()}
            disabled={bulkUploading}
          >
            {bulkUploading ? 'Uploading…' : 'Upload CSV'}
          </Button>
          {bulkResults && (
            <div className="mt-3 space-y-1">
              {bulkResults.map((r, i) => (
                <p key={i} className="text-xs">
                  <span
                    className={
                      r.status === 'sent'
                        ? 'text-green-600'
                        : r.status === 'skipped'
                          ? 'text-yellow-600'
                          : 'text-[var(--color-danger)]'
                    }
                  >
                    [{r.status}]
                  </span>{' '}
                  {r.email}
                  {r.error ? ` — ${r.error}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b">
        {(['active', 'hibernated', 'pending'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'text-gray-500 hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'active'
              ? `Active (${activeUsers.length})`
              : t === 'hibernated'
                ? `Hibernated (${hibernatedUsers.length})`
                : `Invitations (${invitations.length})`}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {tab !== 'pending' ? (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(tab === 'active' ? activeUsers : hibernatedUsers).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8">
                    <EmptyState
                      title={tab === 'active' ? 'No active users' : 'No hibernated users'}
                      description={
                        tab === 'active'
                          ? 'Invite your first team member to get started.'
                          : 'Hibernated users will appear here after 30 days of inactivity.'
                      }
                      {...(tab === 'active'
                        ? { action: { label: 'Invite member', href: '/users' } }
                        : {})}
                    />
                  </td>
                </tr>
              ) : (
                (tab === 'active' ? activeUsers : hibernatedUsers).map((u) => (
                  <UserRow key={u.id} u={u} onAction={handleUserAction} onRemove={handleRemove} />
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    No pending invitations.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <InvitationRow key={inv.id} inv={inv} onAction={handleInvitationAction} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
