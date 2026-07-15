import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { PublicEnv } from '../../config/env'
import type { Database } from '../database/generated/database.types'

export type CooksmithSupabaseClient = SupabaseClient<Database>

export function createSupabaseAuthClient(config: PublicEnv): CooksmithSupabaseClient | null {
  if (!config.supabase) return null

  return createClient<Database>(config.supabase.url, config.supabase.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
    },
  })
}
