import NavBar from '@/components/layout/nav-bar'
import { createSessionClient } from '@/lib/supabase/server'

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

  const links = isOrgAdmin
    ? [
        { href: '/calendar', label: 'Calendar' },
        { href: '/rooms', label: 'Rooms' },
        { href: '/users', label: 'Users' },
        { href: '/approvals', label: 'Approvals' },
        { href: '/reports', label: 'Reports' },
        { href: '/activity-log', label: 'Activity' },
        { href: '/org-settings', label: 'Org Settings' },
        { href: '/settings/billing', label: 'Billing' },
        { href: '/settings', label: 'Settings' },
      ]
    : [
        { href: '/calendar', label: 'Calendar' },
        { href: '/settings', label: 'Settings' },
      ]

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <NavBar brand="Nano Spaces" brandHref="/calendar" links={links} />
      <main>{children}</main>
    </div>
  )
}
