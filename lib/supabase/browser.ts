'use client'

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

let _client: SupabaseClient<Database> | undefined

/**
 * Returns a singleton Supabase browser client.
 * Uses @supabase/ssr for cookie-based session management compatible with middleware.
 * Uses the anon key; RLS enforces data isolation.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error(
        'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
      )
    }
    _client = createSSRBrowserClient<Database>(url, anonKey)
  }
  return _client
}
