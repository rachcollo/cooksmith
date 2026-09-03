import type { Session, User } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import { resolveInitialSession } from './initialSession'

export interface InitialAuthState {
  session: Session | null
  user: User | null
}

export type AuthBootstrapErrorCategory =
  | 'pkce_exchange_failed'
  | 'pkce_exchange_empty'
  | 'pkce_validation_failed'
  | 'session_restore_failed'
  | 'email_link_invalid'
  | 'email_session_failed'
  | 'callback_invalid'

export class AuthBootstrapError extends Error {
  constructor(public readonly category: AuthBootstrapErrorCategory) {
    super('Authentication could not be completed.')
    this.name = 'AuthBootstrapError'
  }
}

export async function bootstrapAuth(
  client: CooksmithSupabaseClient | null,
): Promise<InitialAuthState> {
  if (!client) return { session: null, user: null }

  const result = await resolveInitialSession(client)

  switch (result.status) {
    case 'no-session':
      return { session: null, user: null }
    case 'existing-session-error':
      throw new AuthBootstrapError('session_restore_failed')
    case 'pkce-exchange-error':
      throw new AuthBootstrapError('pkce_exchange_failed')
    case 'pkce-exchange-empty':
      throw new AuthBootstrapError('pkce_exchange_empty')
    case 'email-verification-error':
      throw new AuthBootstrapError('email_link_invalid')
    case 'email-verification-empty':
      throw new AuthBootstrapError('email_session_failed')
    case 'invalid-callback':
      throw new AuthBootstrapError('callback_invalid')
    case 'email-verification-success':
      if (!result.session.user) throw new AuthBootstrapError('email_session_failed')
      return { session: result.session, user: result.session.user }
    case 'pkce-exchange-success':
      if (!result.session.user) throw new AuthBootstrapError('pkce_validation_failed')
      return { session: result.session, user: result.session.user }
    case 'existing-session': {
      const validated = await client.auth.getUser()
      if (validated.error || !validated.data.user) {
        await client.auth.signOut({ scope: 'local' })
        return { session: null, user: null }
      }

      return { session: result.session, user: validated.data.user }
    }
  }
}
