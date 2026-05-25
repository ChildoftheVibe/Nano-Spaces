import Link from 'next/link'
import NotificationBell from '@/components/features/notifications/notification-bell'
import GlobalSearch from '@/components/features/search/global-search'

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            href="/calendar"
            className="font-heading text-lg font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors shrink-0"
          >
            Nano Spaces
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <GlobalSearch />
            <nav className="flex items-center gap-1">
              <Link
                href="/calendar"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Calendar
              </Link>
              <Link
                href="/rooms"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Rooms
              </Link>
              <Link
                href="/approvals"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Approvals
              </Link>
              <Link
                href="/users"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Users
              </Link>
              <Link
                href="/reports"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/activity-log"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Activity
              </Link>
              <Link
                href="/org-settings"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Org Settings
              </Link>
              <Link
                href="/settings"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                My Settings
              </Link>
            </nav>
            <NotificationBell />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
