'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Org {
  id: string
  name: string
  display_name: string | null
  slug: string
  subscription_tier: string
  subscription_status: string
  trial_ends_at: string | null
  subscription_expires_at: string | null
  created_at: string
  tier_user_limit: number | null
  tier_room_limit: number | null
  tier_admin_limit: number | null
}

interface OrgUser {
  id: string
  full_name: string | null
  email: string
  role: string
  is_active: boolean
  hibernate_status: string
  created_at: string
}

interface Room {
  id: string
  name: string
  type: string
  capacity: number | null
  is_active: boolean
  created_at: string
}

type Tab = 'users' | 'rooms' | 'calendar'

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#12131A] dark:ring-1 dark:ring-white/[0.09] p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-white/45 mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={danger ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

function AddUserModal({
  orgId,
  onClose,
  onSuccess,
}: {
  orgId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'org_admin'>('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, role }),
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to create user.')
        return
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#12131A] dark:ring-1 dark:ring-white/[0.09] p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Add User</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="au-name" className="text-xs">
              Full name
            </Label>
            <Input
              id="au-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="au-email" className="text-xs">
              Email
            </Label>
            <Input
              id="au-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="au-pw" className="text-xs">
              Password (min 12 chars)
            </Label>
            <Input
              id="au-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="au-role" className="text-xs">
              Role
            </Label>
            <select
              id="au-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'org_admin')}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-white/[0.07] bg-white dark:bg-white/[0.04] dark:text-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="user">User</option>
              <option value="org_admin">Org Admin</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Adding…' : 'Add User'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function AddRoomModal({
  orgId,
  onClose,
  onSuccess,
}: {
  orgId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'room' | 'building'>('room')
  const [capacity, setCapacity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
        }),
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to create room.')
        return
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#12131A] dark:ring-1 dark:ring-white/[0.09] p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Add Room</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ar-name" className="text-xs">
              Room name
            </Label>
            <Input
              id="ar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ar-type" className="text-xs">
              Type
            </Label>
            <select
              id="ar-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'room' | 'building')}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-white/[0.07] bg-white dark:bg-white/[0.04] dark:text-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="room">Room</option>
              <option value="building">Building</option>
            </select>
          </div>
          <div>
            <Label htmlFor="ar-cap" className="text-xs">
              Capacity (optional)
            </Label>
            <Input
              id="ar-cap"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Adding…' : 'Add Room'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function OrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params['id'] as string

  const [org, setOrg] = useState<Org | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservationCount, setReservationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('users')

  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(false)
  const [confirmClearCalendar, setConfirmClearCalendar] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}`)
      const json = (await res.json()) as {
        success: boolean
        data: { org: Org; users: OrgUser[]; rooms: Room[]; reservationCount: number }
      }
      if (json.success) {
        setOrg(json.data.org)
        setUsers(json.data.users)
        setRooms(json.data.rooms)
        setReservationCount(json.data.reservationCount)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const deleteOrg = async () => {
    setConfirmDeleteOrg(false)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}`, { method: 'DELETE' })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (json.success) {
        router.push('/orgs')
      } else {
        showToast(json.error?.message ?? 'Failed to delete org.', false)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const deleteUser = async (userId: string) => {
    setDeleteUserId(null)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/users/${userId}`, {
        method: 'DELETE',
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (json.success) {
        showToast('User removed.')
        void load()
      } else {
        showToast(json.error?.message ?? 'Failed to remove user.', false)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const deleteRoom = async (roomId: string) => {
    setDeleteRoomId(null)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/rooms/${roomId}`, {
        method: 'DELETE',
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (json.success) {
        showToast('Room deleted.')
        void load()
      } else {
        showToast(json.error?.message ?? 'Failed to delete room.', false)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const clearCalendar = async () => {
    setConfirmClearCalendar(false)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/calendar`, { method: 'DELETE' })
      const json = (await res.json()) as {
        success: boolean
        data?: { deleted: number }
        error?: { message: string }
      }
      if (json.success) {
        showToast(`Calendar cleared — ${json.data?.deleted ?? 0} reservations removed.`)
        void load()
      } else {
        showToast(json.error?.message ?? 'Failed to clear calendar.', false)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const statusColor = (s: string) =>
    s === 'active'
      ? 'bg-green-100 text-green-700'
      : s === 'trial'
        ? 'bg-blue-100 text-blue-700'
        : s === 'expired' || s === 'cancelled'
          ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-600'

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-gray-400">Loading…</div>
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        Organization not found.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/super-admin/orgs')}
            className="mt-0.5 rounded-md p-1 text-gray-400 dark:text-white/35 hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {org.display_name ?? org.name}
            </h1>
            <p className="text-xs text-gray-400 dark:text-white/35 mt-0.5">{org.slug}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(org.subscription_status)}`}
              >
                {org.subscription_status}
              </span>
              <span className="rounded-full bg-gray-100 dark:bg-white/[0.07] px-2 py-0.5 text-xs text-gray-600 dark:text-white/60 capitalize">
                {org.subscription_tier}
              </span>
              <span className="text-xs text-gray-400 dark:text-white/35">
                Created {format(new Date(org.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="rounded-md border dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setConfirmDeleteOrg(true)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Org
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Users, label: 'Users', value: users.length, limit: org.tier_user_limit },
          { icon: Building2, label: 'Rooms', value: rooms.length, limit: org.tier_room_limit },
          { icon: Calendar, label: 'Active Reservations', value: reservationCount, limit: null },
        ].map(({ icon: Icon, label, value, limit }) => (
          <div
            key={label}
            className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-gray-400 dark:text-white/30" />
              <span className="text-xs text-gray-500 dark:text-white/45">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
              {limit !== null && (
                <span className="text-sm font-normal text-gray-400 dark:text-white/35 ml-1">
                  / {limit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-white/[0.07] mb-6">
        <nav className="flex gap-4">
          {(
            [
              { key: 'users', label: 'Users', count: users.length },
              { key: 'rooms', label: 'Rooms', count: rooms.length },
              { key: 'calendar', label: 'Calendar', count: reservationCount },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'
              }`}
            >
              {label}
              <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-white/[0.07] px-1.5 py-0.5 text-xs text-gray-500 dark:text-white/40">
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white/70">Members</h2>
            <Button size="sm" onClick={() => setShowAddUser(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add User
            </Button>
          </div>
          <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.04] border-b dark:border-white/[0.06]">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/45 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                      {u.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-white/45">{u.email}</td>
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-white/60">
                      {u.role.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {u.is_active ? 'active' : 'suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-white/30">
                      {format(new Date(u.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteUserId(u.id)}
                        disabled={actionLoading}
                        className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-white/35">
                No users in this organization.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rooms Tab */}
      {tab === 'rooms' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white/70">
              Rooms & Spaces
            </h2>
            <Button size="sm" onClick={() => setShowAddRoom(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Room
            </Button>
          </div>
          <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.04] border-b dark:border-white/[0.06]">
                <tr>
                  {['Name', 'Type', 'Capacity', 'Status', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/45 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-white/60">
                      {r.type}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-white/45">
                      {r.capacity ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {r.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-white/30">
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteRoomId(r.id)}
                        disabled={actionLoading}
                        className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rooms.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-white/35">
                No rooms configured for this organization.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <div>
          <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Clear Calendar
                </h2>
                <p className="text-sm text-gray-500 dark:text-white/45 mb-4">
                  This will permanently delete all {reservationCount} confirmed and pending
                  reservations for this organization. This action cannot be undone.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClearCalendar(true)}
                  disabled={actionLoading || reservationCount === 0}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear All Reservations
                </Button>
                {reservationCount === 0 && (
                  <p className="text-xs text-gray-400 dark:text-white/30 mt-2">
                    No active reservations to clear.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddUser && (
        <AddUserModal
          orgId={orgId}
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            setShowAddUser(false)
            showToast('User added.')
            void load()
          }}
        />
      )}

      {showAddRoom && (
        <AddRoomModal
          orgId={orgId}
          onClose={() => setShowAddRoom(false)}
          onSuccess={() => {
            setShowAddRoom(false)
            showToast('Room created.')
            void load()
          }}
        />
      )}

      {confirmDeleteOrg && (
        <ConfirmModal
          title="Delete Organization"
          message={`Are you sure you want to permanently delete "${org.display_name ?? org.name}" and all its users, rooms, and reservations? This cannot be undone.`}
          onConfirm={() => void deleteOrg()}
          onCancel={() => setConfirmDeleteOrg(false)}
          danger
        />
      )}

      {confirmClearCalendar && (
        <ConfirmModal
          title="Clear Calendar"
          message={`Delete all ${reservationCount} reservations for "${org.display_name ?? org.name}"? This cannot be undone.`}
          onConfirm={() => void clearCalendar()}
          onCancel={() => setConfirmClearCalendar(false)}
          danger
        />
      )}

      {deleteUserId && (
        <ConfirmModal
          title="Remove User"
          message="Permanently delete this user and all their data? This cannot be undone."
          onConfirm={() => void deleteUser(deleteUserId)}
          onCancel={() => setDeleteUserId(null)}
          danger
        />
      )}

      {deleteRoomId && (
        <ConfirmModal
          title="Delete Room"
          message="Permanently delete this room and all its bookings? This cannot be undone."
          onConfirm={() => void deleteRoom(deleteRoomId)}
          onCancel={() => setDeleteRoomId(null)}
          danger
        />
      )}
    </div>
  )
}
