import { render, screen, waitFor } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useState } from 'react'

import { RouterProvider } from 'react-router-dom'

import { LoadingState } from '../../src/components/ui/LoadingState'
import {
  AuthBootstrapError,
  bootstrapAuth,
  type InitialAuthState,
} from '../../src/application/auth/bootstrapAuth'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'
import type { PublicEnv } from '../../src/config/env'
import { AppProviders } from '../../src/app/providers/AppProviders'
import { createTestRouter } from '../../src/app/router/createAppRouter'
import { AuthCallbackError } from '../../src/app/errors/AuthCallbackError'
import { completedOnboardingRepository, ownerHouseholdPeopleRepository } from '../renderApp'

const config: PublicEnv = { appEnvironment: 'test', buildCommit: 'test-build' }

function clientWithAuth(auth: Record<string, unknown>) {
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
      ...auth,
    },
  } as unknown as CooksmithSupabaseClient
}

function BootstrapHarness({ client }: { client: CooksmithSupabaseClient | null }) {
  const [state, setState] = useState<InitialAuthState | null>(null)

  useEffect(() => {
    let active = true
    void bootstrapAuth(client).then((nextState) => {
      if (active) setState(nextState)
    })
    return () => {
      active = false
    }
  }, [client])

  if (!state) return <LoadingState label="Getting Cooksmith ready" fullPage />
  return (
    <AppProviders
      authClient={client}
      config={config}
      initialAuthState={state}
      onboardingRepository={completedOnboardingRepository}
      householdPeopleRepository={ownerHouseholdPeopleRepository}
    >
      <RouterProvider router={createTestRouter(['/'])} />
    </AppProviders>
  )
}

function expectAuthBootstrapError(error: unknown, category: AuthBootstrapError['category']) {
  expect(error).toBeInstanceOf(AuthBootstrapError)
  expect((error as AuthBootstrapError).category).toBe(category)
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('deterministic authentication bootstrap', () => {
  it('does not mount the router while a delayed PKCE exchange is unresolved', async () => {
    const user = { id: 'delayed-pkce-user' } as User
    const session = { user } as Session
    let resolveExchange!: (value: { data: { session: Session; user: User }; error: null }) => void
    const exchangeCodeForSession = vi.fn(
      () =>
        new Promise<{ data: { session: Session; user: User }; error: null }>((resolve) => {
          resolveExchange = resolve
        }),
    )
    const getSession = vi.fn()
    const getUser = vi.fn(async () => ({ data: { user: null }, error: new Error('redundant') }))
    const signOut = vi.fn(async () => ({ error: null }))
    const onAuthStateChange = vi.fn(
      (callback: (event: string, nextSession: Session | null) => void) => {
        callback('INITIAL_SESSION', null)
        return { data: { subscription: { unsubscribe() {} } } }
      },
    )
    const client = clientWithAuth({
      exchangeCodeForSession,
      getSession,
      getUser,
      signOut,
      onAuthStateChange,
    })

    window.history.replaceState(null, '', '/?code=delayed-code')
    render(<BootstrapHarness client={client} />)

    expect(await screen.findByText('Getting Cooksmith ready')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Welcome to Cooksmith' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Dinner decisions, made lighter.' }),
    ).not.toBeInTheDocument()

    resolveExchange({ data: { session, user }, error: null })

    await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
    expect(exchangeCodeForSession).toHaveBeenCalledOnce()
    expect(exchangeCodeForSession).toHaveBeenCalledWith('delayed-code')
    expect(getSession).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('returnTo')
    expect(screen.queryByRole('heading', { name: 'Welcome to Cooksmith' })).not.toBeInTheDocument()
  })

  it('authenticates successful PKCE exchange immediately from the exchanged session user', async () => {
    const user = { id: 'pkce-user' } as User
    const session = { user } as Session
    const getUser = vi.fn(async () => ({
      data: { user: null },
      error: new Error('should not run'),
    }))
    const signOut = vi.fn(async () => ({ error: null }))
    const client = clientWithAuth({
      exchangeCodeForSession: vi.fn(async () => ({ data: { session, user }, error: null })),
      getUser,
      signOut,
    })

    window.history.replaceState(null, '', '/auth/confirm?code=valid-code')

    await expect(bootstrapAuth(client)).resolves.toEqual({ session, user })
    expect(getUser).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
    expect(window.location.href).toBe('http://localhost:3000/auth/confirm')
  })

  it('categorises failed PKCE exchange and removes the authorization code', async () => {
    const client = clientWithAuth({
      exchangeCodeForSession: vi.fn(async () => ({
        data: { session: null },
        error: new Error('provider'),
      })),
    })

    window.history.replaceState(null, '', '/auth/confirm?code=bad-code&next=%2F')

    await bootstrapAuth(client).catch((error: unknown) =>
      expectAuthBootstrapError(error, 'pkce_exchange_failed'),
    )
    expect(window.location.href).toBe('http://localhost:3000/auth/confirm?next=%2F')
  })

  it('shows calm recovery without raw callback details for a failed legacy exchange', () => {
    render(<AuthCallbackError category="pkce_exchange_failed" />)

    expect(screen.getByRole('heading', { name: 'Please sign in to continue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument()
    expect(screen.queryByText(/same browser/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/pkce_exchange_failed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/provider/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bad-code/i)).not.toBeInTheDocument()
  })

  it('establishes a session from a token hash without browser-local PKCE state', async () => {
    const user = { id: 'cross-browser-user' } as User
    const session = { user } as Session
    const verifyOtp = vi.fn(async () => ({ data: { session, user }, error: null }))
    const exchangeCodeForSession = vi.fn()
    const client = clientWithAuth({ verifyOtp, exchangeCodeForSession })

    window.history.replaceState(
      null,
      '',
      '/auth/confirm?returnTo=%2Frecipes&token_hash=one-time-value&type=email',
    )

    await expect(bootstrapAuth(client)).resolves.toEqual({ session, user })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'one-time-value', type: 'email' })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(window.location.href).toBe('http://localhost:3000/auth/confirm?returnTo=%2Frecipes')
  })

  it.each([
    '/auth/confirm?token_hash=value',
    '/auth/confirm?token_hash=value&type=signup',
    '/auth/confirm?token_hash=value&type=email&code=legacy',
    '/auth/confirm?token_hash=first&token_hash=second&type=email',
  ])('fails closed for malformed or mixed callback contract %s', async (path) => {
    const verifyOtp = vi.fn()
    const exchangeCodeForSession = vi.fn()
    const client = clientWithAuth({ verifyOtp, exchangeCodeForSession })
    window.history.replaceState(null, '', path)

    await bootstrapAuth(client).catch((error: unknown) =>
      expectAuthBootstrapError(error, 'callback_invalid'),
    )
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
  })

  it('categorises expired or reused token hashes without exposing provider errors', async () => {
    const client = clientWithAuth({
      verifyOtp: vi.fn(async () => ({ data: { session: null }, error: new Error('raw provider') })),
    })
    window.history.replaceState(null, '', '/auth/confirm?token_hash=expired&type=email')

    await bootstrapAuth(client).catch((error: unknown) =>
      expectAuthBootstrapError(error, 'email_link_invalid'),
    )
    expect(window.location.search).toBe('')
  })

  it('categorises an empty PKCE exchange result', async () => {
    const client = clientWithAuth({
      exchangeCodeForSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    })

    window.history.replaceState(null, '', '/auth/confirm?code=empty-code')

    await bootstrapAuth(client).catch((error: unknown) =>
      expectAuthBootstrapError(error, 'pkce_exchange_empty'),
    )
    expect(window.location.search).toBe('')
  })

  it('rejects a PKCE session without a user as an empty exchange', async () => {
    const client = clientWithAuth({
      exchangeCodeForSession: vi.fn(async () => ({ data: { session: {} }, error: null })),
    })

    window.history.replaceState(null, '', '/auth/confirm?code=missing-user')

    await bootstrapAuth(client).catch((error: unknown) =>
      expectAuthBootstrapError(error, 'pkce_exchange_empty'),
    )
  })

  it('restores an existing session and validates it with getUser when there is no PKCE code', async () => {
    const user = { id: 'existing-user' } as User
    const session = { user } as Session
    const getSession = vi.fn(async () => ({ data: { session }, error: null }))
    const getUser = vi.fn(async () => ({ data: { user }, error: null }))
    const exchangeCodeForSession = vi.fn()
    const client = clientWithAuth({ exchangeCodeForSession, getSession, getUser })

    window.history.replaceState(null, '', '/')
    const state = await bootstrapAuth(client)

    expect(state).toEqual({ session, user })
    expect(getSession).toHaveBeenCalledOnce()
    expect(getUser).toHaveBeenCalledOnce()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('signs out locally when a restored user cannot be validated', async () => {
    const session = { user: { id: 'stale-user' } as User } as Session
    const signOut = vi.fn(async () => ({ error: null }))
    const client = clientWithAuth({
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: null }, error: new Error('invalid') }),
      signOut,
    })

    await expect(bootstrapAuth(client)).resolves.toEqual({ session: null, user: null })
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('updates the provider after subsequent auth state changes', async () => {
    const user = { id: 'signed-in-later' } as User
    const session = { user } as Session
    let emit!: (session: Session | null) => void
    const client = clientWithAuth({
      onAuthStateChange: (callback: (event: string, nextSession: Session | null) => void) => {
        emit = (nextSession) => callback('SIGNED_IN', nextSession)
        return { data: { subscription: { unsubscribe() {} } } }
      },
    })

    render(
      <AppProviders
        authClient={client}
        config={config}
        initialAuthState={{ session: null, user: null }}
        onboardingRepository={completedOnboardingRepository}
        householdPeopleRepository={ownerHouseholdPeopleRepository}
      >
        <RouterProvider router={createTestRouter(['/'])} />
      </AppProviders>,
    )
    await screen.findByRole('heading', { name: 'Welcome to Cooksmith' })

    emit(session)

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Dinner decisions, made lighter.' }),
      ).toBeInTheDocument(),
    )
  })
})
