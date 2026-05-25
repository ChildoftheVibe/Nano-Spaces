import NavBar from '@/components/layout/nav-bar'

const LINKS = [
  { href: '/calendar', label: 'Calendar' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/users', label: 'Users' },
  { href: '/reports', label: 'Reports' },
  { href: '/activity-log', label: 'Activity' },
  { href: '/org-settings', label: 'Org Settings' },
  { href: '/settings', label: 'My Settings' },
]

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <NavBar brand="Nano Spaces" brandHref="/calendar" links={LINKS} />
      <main>{children}</main>
    </div>
  )
}
