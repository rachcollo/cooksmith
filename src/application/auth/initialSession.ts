import type { Session } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'

export type InitialSessionResult =
  | { status: 'no-session'; session: null; error: null }
  | { status: 'existing-session'; session: Session; error: null }
  | { status: 'existing-session-error'; session: null; error: unknown }
  | { status: 'pkce-exchange-success'; session: Session; error: null }
  | { status: 'pkce-exchange-error'; session: null; error: unknown }
  | { status: 'pkce-exchange-empty'; session: null; error: null }

function removeAuthorizationCode(url: URL) {
  url.searchParams.delete('code')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function hasSessionUser(session: Session | null | undefined): session is Session {
  return Boolean(session?.user)
}

export async function resolveInitialSession(
  client: CooksmithSupabaseClient,
): Promise<InitialSessionResult> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')

  if (!code) {
    const { data, error } = await client.auth.getSession()
    if (error) return { status: 'existing-session-error', session: null, error }
    if (!hasSessionUser(data.session)) return { status: 'no-session', session: null, error: null }
    return { status: 'existing-session', session: data.session, error: null }
  }

  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (error) return { status: 'pkce-exchange-error', session: null, error }
    if (!hasSessionUser(data.session))
      return { status: 'pkce-exchange-empty', session: null, error: null }
    return { status: 'pkce-exchange-success', session: data.session, error: null }
  } finally {
    removeAuthorizationCode(url)
  }
}
