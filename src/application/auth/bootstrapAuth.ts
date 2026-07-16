import type { Session, User } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import { resolveInitialSession } from './initialSession'

export interface InitialAuthState {
  session: Session | null
  user: User | null
}

export async function bootstrapAuth(
  client: CooksmithSupabaseClient | null,
): Promise<InitialAuthState> {
  if (!client) return { session: null, user: null }

  const { session, error } = await resolveInitialSession(client)
  if (error || !session) return { session: null, user: null }
