import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import type { Database } from '@/types/supabase'

/**
 * User-context client: reads/writes session cookies.
 * Use in Server Components and API routes that need the authenticated user's session.
 * RLS is enforced — user can only access their org's data.
 */
export async function createSessionClient() {
  const cookieStore = await cookies()
  return createSSRClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — cookies are read-only there
          }
        },
      },
    },
  )
}

/**
 * Service role client: bypasses RLS entirely.
 * Use only in trusted server-side contexts (cron jobs, admin operations, auth routes).
 * Never expose to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
