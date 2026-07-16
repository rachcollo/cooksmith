import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderApp, signedOutTestAuthState } from '../renderApp'

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

  it('does not create a nested returnTo after bootstrap resolves as signed out', async () => {
    const { router } = renderApp(
      '/?code=stale-code',
      undefined,
      null,
      undefined,
      undefined,
      signedOutTestAuthState,
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/welcome'))
    expect(router.state.location.search).toBe(
      `?returnTo=${encodeURIComponent('/?code=stale-code')}`,
    )
    expect(router.state.location.search).not.toContain('returnTo=%2Fwelcome')
  })
})
