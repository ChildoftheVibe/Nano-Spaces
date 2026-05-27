import { CookieConsent } from '@/components/features/auth/cookie-consent'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieConsent />
    </>
  )
}
