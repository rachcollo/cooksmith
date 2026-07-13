import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../renderApp'

describe('v2 application shell', () => {
  it('renders the foundation home through the shared layout', async () => {
    renderApp('/')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'A calmer way to answer, “What’s for dinner?”',
      }),
    ).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Foundation navigation' })).toBeVisible()
    expect(screen.getByText('v2 test preview')).toBeVisible()
  })

  it('reports the active environment on the health route', async () => {
    renderApp('/health', { appEnvironment: 'preview', buildCommit: 'abc123' })

    expect(await screen.findByRole('heading', { name: 'The forge is ready.' })).toBeVisible()
    expect(screen.getByText('preview')).toBeVisible()
    expect(screen.getByText('abc123')).toBeVisible()
  })

  it('gives a useful next action for unknown routes', async () => {
    renderApp('/missing')

    expect(await screen.findByRole('heading', { name: 'Nothing cooking here' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to Cooksmith' })).toHaveAttribute('href', '/')
  })
})
