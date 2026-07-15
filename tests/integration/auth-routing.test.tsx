import { screen, waitFor } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderApp } from '../renderApp'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('authentication routing', () => {
  it('protects application routes when there is no configured session', async () => {
    const { router } = renderApp('/recipes', undefined, null)
    await waitFor(() => expect(router.state.location.pathname).toBe('/welcome'))
    expect(screen.getByRole('heading', { name: 'Welcome to Cooksmith' })).toBeInTheDocument()
  })

  it('keeps health public', async () => {
    renderApp('/health', undefined, null)
    expect(await screen.findByRole('heading', { name: 'The forge is ready.' })).toBeInTheDocument()
  })

  it('exchanges a PKCE code before protected routing and removes it from the URL', async () => {
    const user = { id: 'pkce-user' } as User
    const session = { user } as Session
    const exchangeCodeForSession = vi.fn(async () => ({ data: { session, user }, error: null }))
    const getSession = vi.fn()
    const client = {
      auth: {
        exchangeCodeForSession,
        getSession,
        getUser: async () => ({ data: { user }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signOut: async () => ({ error: null }),
      },
    } as unknown as CooksmithSupabaseClient

    window.history.replaceState(null, '', '/?code=one-time-code')
    const { router } = renderApp('/?code=one-time-code', undefined, client)

    await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
    expect(router.state.location.pathname).toBe('/')
    expect(exchangeCodeForSession).toHaveBeenCalledOnce()
    expect(exchangeCodeForSession).toHaveBeenCalledWith('one-time-code')
    expect(getSession).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
  })
})
