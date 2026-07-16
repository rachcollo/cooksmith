import type { Session } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'

export type InitialSessionResolution =
  | { kind: 'no-session' }
  | { kind: 'existing-session'; session: Session }
  | { kind: 'existing-session-error'; error: unknown }
  | { kind: 'pkce-exchange-success'; session: Session }
  | { kind: 'pkce-exchange-error'; error: unknown }
  | { kind: 'pkce-exchange-empty' }

function removeAuthorizationCode(url: URL) {
  url.searchParams.delete('code')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function resolveInitialSession(
  client: CooksmithSupabaseClient,
): Promise<InitialSessionResolution> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')

  if (!code) {
    const { data, error } = await client.auth.getSession()
    if (error) return { kind: 'existing-session-error', error }
    if (!data.session) return { kind: 'no-session' }
    return { kind: 'existing-session', session: data.session }
  }

  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (error) return { kind: 'pkce-exchange-error', error }
    if (!data.session) return { kind: 'pkce-exchange-empty' }
    return { kind: 'pkce-exchange-success', session: data.session }
  } catch (error: unknown) {
    return { kind: 'pkce-exchange-error', error }
  } finally {
    removeAuthorizationCode(url)
  }
}
