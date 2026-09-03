import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'
import { renderApp, signedOutTestAuthState } from '../renderApp'

function signedOutClient(signInWithOtp: ReturnType<typeof vi.fn>) {
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp,
    },
  } as unknown as CooksmithSupabaseClient
}

describe('unified email authentication', () => {
  it('presents one primary email path while preserving password alternatives', () => {
    renderApp('/welcome?returnTo=%2Frecipes', undefined, null)

    expect(screen.getByRole('link', { name: 'Continue with email' })).toHaveAttribute(
      'href',
      '/auth/magic-link?returnTo=%2Frecipes',
    )
    expect(screen.getByRole('link', { name: 'Sign in with a password' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('allows account creation and always shows neutral request copy', async () => {
    const signInWithOtp = vi.fn(async () => ({
      data: { user: null, session: null as Session | null },
      error: null,
    }))
    const client = signedOutClient(signInWithOtp)
    renderApp(
      '/auth/magic-link?returnTo=%2Frecipes',
      undefined,
      client,
      undefined,
      undefined,
      undefined,
      undefined,
      signedOutTestAuthState,
    )

    await userEvent.type(screen.getByLabelText('Email'), 'person@example.invalid')
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }))

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'person@example.invalid',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/confirm?returnTo=%2Frecipes',
        shouldCreateUser: true,
      },
    })
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/If this address can receive a Cooksmith email/i)).toBeInTheDocument()
    expect(screen.queryByText(/account (exists|created|not found)/i)).not.toBeInTheDocument()
  })

  it('gives password signup a redirect that the confirmation template can append to', async () => {
    const signUp = vi.fn(async () => ({
      data: { user: null, session: null as Session | null },
      error: null,
    }))
    const client = {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signUp,
      },
    } as unknown as CooksmithSupabaseClient
    renderApp(
      '/auth/create-account?returnTo=%2Frecipes',
      undefined,
      client,
      undefined,
      undefined,
      undefined,
      undefined,
      signedOutTestAuthState,
    )

    await userEvent.type(screen.getByLabelText('Email'), 'person@example.invalid')
    await userEvent.type(screen.getByLabelText('Password'), 'secure-pass-123')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(signUp).toHaveBeenCalledWith({
      email: 'person@example.invalid',
      password: 'secure-pass-123',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/confirm?returnTo=%2Frecipes',
      },
    })
  })
})
