import type { EmailOtpType, Session } from '@supabase/supabase-js'

import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import { recordAuthEvent } from './authTelemetry'

export type InitialSessionResult =
  | { status: 'no-session'; session: null; error: null }
  | { status: 'existing-session'; session: Session; error: null }
  | { status: 'existing-session-error'; session: null; error: unknown }
  | { status: 'pkce-exchange-success'; session: Session; error: null }
  | { status: 'pkce-exchange-error'; session: null; error: unknown }
  | { status: 'pkce-exchange-empty'; session: null; error: null }
  | { status: 'email-verification-success'; session: Session; error: null }
  | { status: 'email-verification-error'; session: null; error: unknown }
  | { status: 'email-verification-empty'; session: null; error: null }
  | { status: 'recovery-verification-success'; session: Session; error: null }
  | { status: 'recovery-verification-error'; session: null; error: unknown }
  | { status: 'recovery-verification-empty'; session: null; error: null }
  | { status: 'invalid-callback'; session: null; error: null }

function removeCallbackSecrets(url: URL) {
  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

type AuthCallback =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'legacy-code'; code: string; purpose: 'email' | 'recovery' }
  | { kind: 'token-hash'; tokenHash: string; type: EmailOtpType }

export function parseAuthCallback(url: URL): AuthCallback {
  const codes = url.searchParams.getAll('code')
  const hashes = url.searchParams.getAll('token_hash')
  const types = url.searchParams.getAll('type')
  const hasCallbackParameter = codes.length > 0 || hashes.length > 0 || types.length > 0

  if (!hasCallbackParameter) return { kind: 'none' }
  if (codes.length === 1 && codes[0] && hashes.length === 0 && types.length === 0) {
    return {
      kind: 'legacy-code',
      code: codes[0],
      purpose: url.pathname === '/auth/reset-password' ? 'recovery' : 'email',
    }
  }
  if (codes.length === 0 && hashes.length === 1 && hashes[0] && types.length === 1) {
    const type = types[0]
    if (url.pathname === '/auth/confirm' && type === 'email') {
      return { kind: 'token-hash', tokenHash: hashes[0], type }
    }
    if (url.pathname === '/auth/reset-password' && type === 'recovery') {
      return { kind: 'token-hash', tokenHash: hashes[0], type }
    }
  }
  return { kind: 'invalid' }
}

function hasSessionUser(session: Session | null | undefined): session is Session {
  return Boolean(session?.user)
}

export async function resolveInitialSession(
  client: CooksmithSupabaseClient,
): Promise<InitialSessionResult> {
  const url = new URL(window.location.href)
  const callback = parseAuthCallback(url)

  if (callback.kind === 'none') {
    const { data, error } = await client.auth.getSession()
    if (error) return { status: 'existing-session-error', session: null, error }
    if (!hasSessionUser(data.session)) return { status: 'no-session', session: null, error: null }
    return { status: 'existing-session', session: data.session, error: null }
  }

  removeCallbackSecrets(url)
  if (callback.kind === 'invalid') {
    recordAuthEvent({ name: 'auth_callback', outcome: 'invalid' })
    return { status: 'invalid-callback', session: null, error: null }
  }

  if (callback.kind === 'token-hash') {
    const { data, error } = await client.auth.verifyOtp({
      token_hash: callback.tokenHash,
      type: callback.type,
    })
    if (error) {
      recordAuthEvent({ name: 'auth_callback', outcome: 'token_hash_failed' })
      return {
        status:
          callback.type === 'recovery' ? 'recovery-verification-error' : 'email-verification-error',
        session: null,
        error,
      }
    }
    if (!hasSessionUser(data.session)) {
      recordAuthEvent({ name: 'auth_callback', outcome: 'token_hash_failed' })
      return {
        status:
          callback.type === 'recovery' ? 'recovery-verification-empty' : 'email-verification-empty',
        session: null,
        error: null,
      }
    }
    recordAuthEvent({ name: 'auth_callback', outcome: 'token_hash_success' })
    return {
      status:
        callback.type === 'recovery'
          ? 'recovery-verification-success'
          : 'email-verification-success',
      session: data.session,
      error: null,
    }
  }

  {
    const { data, error } = await client.auth.exchangeCodeForSession(callback.code)
    if (error) {
      recordAuthEvent({ name: 'auth_callback', outcome: 'legacy_failed' })
      return {
        status:
          callback.purpose === 'recovery' ? 'recovery-verification-error' : 'pkce-exchange-error',
        session: null,
        error,
      }
    }
    if (!hasSessionUser(data.session)) {
      recordAuthEvent({ name: 'auth_callback', outcome: 'legacy_failed' })
      return {
        status:
          callback.purpose === 'recovery' ? 'recovery-verification-empty' : 'pkce-exchange-empty',
        session: null,
        error: null,
      }
    }
    recordAuthEvent({ name: 'auth_callback', outcome: 'legacy_success' })
    return { status: 'pkce-exchange-success', session: data.session, error: null }
  }
}
