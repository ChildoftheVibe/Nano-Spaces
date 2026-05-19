import Link from 'next/link'

export default function UserLayout({ children }: { children: React.ReactNode }) {
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
              href="/settings"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/settings/billing"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors"
            >
              Billing
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
