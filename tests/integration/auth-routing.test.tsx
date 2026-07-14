import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../renderApp'

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
})
