import Link from 'next/link'
import NotificationBell from '@/components/features/notifications/notification-bell'
import GlobalSearch from '@/components/features/search/global-search'
import { createSessionClient } from '@/lib/supabase/server'

const navLink =
  'rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[var(--text-primary)] transition-colors'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  const isOrgAdmin = role === 'org_admin' || role === 'super_admin'

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
          <div className="flex items-center gap-2 flex-1 justify-end" data-tour="nav">
            <div data-tour="search">
              <GlobalSearch />
            </div>
            <nav className="flex items-center gap-1">
              <Link href="/calendar" className={navLink}>
                Calendar
              </Link>
              {isOrgAdmin && (
                <>
                  <Link href="/rooms" className={navLink}>
                    Rooms
                  </Link>
                  <Link href="/users" className={navLink}>
                    Users
                  </Link>
                  <Link href="/approvals" className={navLink}>
                    Approvals
                  </Link>
                  <Link href="/reports" className={navLink}>
                    Reports
                  </Link>
                  <Link href="/activity-log" className={navLink}>
                    Activity
                  </Link>
                  <Link href="/org-settings" className={navLink}>
                    Org Settings
                  </Link>
                </>
              )}
              <Link href="/settings" className={navLink}>
                Settings
              </Link>
              {!isOrgAdmin && (
                <Link href="/settings/billing" className={navLink}>
                  Billing
                </Link>
              )}
            </nav>
            <div data-tour="notifications">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
