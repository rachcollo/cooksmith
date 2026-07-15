import type { Session } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'

function removeAuthorizationCode(url: URL) {
  url.searchParams.delete('code')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function resolveInitialSession(
  client: CooksmithSupabaseClient,
): Promise<{ session: Session | null; error: unknown }> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')

  if (!code) return client.auth.getSession().then(({ data, error }) => ({ ...data, error }))

  const { data, error } = await client.auth.exchangeCodeForSession(code)
  removeAuthorizationCode(url)
  return { session: data.session, error }
}
