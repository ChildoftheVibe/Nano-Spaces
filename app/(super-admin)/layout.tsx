import NavBar from '@/components/layout/nav-bar'

const LINKS = [
  { href: '/orgs', label: 'Orgs' },
  { href: '/god-mode-audit', label: 'God Mode Audit' },
  { href: '/reports', label: 'Reports' },
  { href: '/marketing', label: 'Marketing' },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <NavBar
        brand="Nano Spaces"
        brandSub="Super Admin"
        brandHref="/orgs"
        links={LINKS}
        isSuperAdmin
      />
      <main>{children}</main>
    </div>
  )
}
