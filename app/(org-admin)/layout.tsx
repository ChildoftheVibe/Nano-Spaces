import Link from 'next/link'

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/calendar"
            className="font-heading text-lg font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors"
          >
            Nano Spaces
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/calendar"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
            >
              Calendar
            </Link>
            <Link
              href="/org-admin/rooms"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
            >
              Rooms
            </Link>
            <Link
              href="/org-admin/approvals"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
            >
              Approvals
            </Link>
            <Link
              href="/org-admin/users"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
            >
              Users
            </Link>
            <Link
              href="/org-admin/org-settings"
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
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
