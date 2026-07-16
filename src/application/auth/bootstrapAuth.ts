import type { Session, User } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import { resolveInitialSession } from './initialSession'

export type AuthBootstrapFailureCategory =
  | 'pkce_exchange_failed'
  | 'pkce_exchange_empty'
  | 'pkce_validation_failed'
  | 'session_restore_failed'

export class AuthBootstrapError extends Error {
  readonly category: AuthBootstrapFailureCategory
  override readonly cause: unknown

  constructor(category: AuthBootstrapFailureCategory, cause?: unknown) {
    super('Cooksmith could not complete authentication. Please request a new magic link.')
    this.name = 'AuthBootstrapError'
    this.category = category
    this.cause = cause
  }
}

export function isAuthBootstrapError(error: unknown): error is AuthBootstrapError {
  return error instanceof AuthBootstrapError
}

export interface InitialAuthState {
  session: Session | null
  user: User | null
}

function hasSessionUser(session: Session): session is Session & { user: User } {
  return Boolean(session.user?.id)
}

export async function bootstrapAuth(
  client: CooksmithSupabaseClient | null,
): Promise<InitialAuthState> {
  if (!client) return { session: null, user: null }

  const resolution = await resolveInitialSession(client)

  switch (resolution.kind) {
    case 'no-session':
      return { session: null, user: null }
    case 'existing-session-error':
      throw new AuthBootstrapError('session_restore_failed', resolution.error)
    case 'pkce-exchange-error':
      throw new AuthBootstrapError('pkce_exchange_failed', resolution.error)
    case 'pkce-exchange-empty':
      throw new AuthBootstrapError('pkce_exchange_empty')
    case 'pkce-exchange-success':
      if (!hasSessionUser(resolution.session)) {
        throw new AuthBootstrapError('pkce_validation_failed')
      }
      // Supabase's PKCE exchange returns the authenticated session. Use that exchanged
      // session as the callback identity so a redundant immediate getUser() call cannot
      // race browser persistence and force a refresh before route guards see the user.
      // Household access remains enforced by Supabase RLS on subsequent data requests.
      return { session: resolution.session, user: resolution.session.user }
    case 'existing-session': {
      const validated = await client.auth.getUser()
      if (validated.error || !validated.data.user) {
        await client.auth.signOut({ scope: 'local' })
        return { session: null, user: null }
      }
      return { session: resolution.session, user: validated.data.user }
    }
  }
}
