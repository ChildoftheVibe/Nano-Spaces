import dynamic from 'next/dynamic'
import { createSessionClient } from '@/lib/supabase/server'

const CalendarClient = dynamic(() => import('./calendar-client'), { ssr: false })
const OnboardingChecklist = dynamic(
  () => import('@/components/features/onboarding/onboarding-checklist'),
  { ssr: false },
)
const AppTour = dynamic(() => import('@/components/features/tour/app-tour'), { ssr: false })

export default async function CalendarPage() {
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let orgId: string | null = null
  let role: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()
    orgId = profile?.org_id ?? null
    role = profile?.role ?? null
  }

  return (
    <>
      <div data-tour="calendar">
        <CalendarClient />
      </div>
      {/* Only org admins see the onboarding checklist */}
      {orgId && role === 'org_admin' && <OnboardingChecklist orgId={orgId} />}
      <AppTour />
    </>
  )
}
