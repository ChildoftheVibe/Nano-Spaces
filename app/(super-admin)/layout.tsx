import Link from 'next/link'
import NotificationBell from '@/components/features/notifications/notification-bell'
import GlobalSearch from '@/components/features/search/global-search'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/super-admin/orgs"
            className="font-heading text-lg font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors shrink-0"
          >
            Nano Spaces <span className="text-xs font-normal text-gray-400 ml-1">Super Admin</span>
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <GlobalSearch isSuperAdmin />
            <nav className="flex items-center gap-1">
              <Link
                href="/super-admin/orgs"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Orgs
              </Link>
              <Link
                href="/super-admin/god-mode-audit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                God Mode Audit
              </Link>
              <Link
                href="/org-admin/reports"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/super-admin/marketing"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
              >
                Marketing
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
