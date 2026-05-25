import { type NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }

  const supabase = await createSessionClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }

  // Check if this OAuth user already has a profile (invited user using social login)
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (!profile) {
    // New user — collect org details before onboarding
    return NextResponse.redirect(`${appUrl}/auth/oauth-signup`)
  }

  return NextResponse.redirect(`${appUrl}/calendar`)
}
