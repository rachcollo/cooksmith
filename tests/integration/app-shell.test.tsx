import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp, renderRouteError } from '../renderApp'

describe('v2 application shell', () => {
  it('renders the home route through the responsive application frame', async () => {
    renderApp('/')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Dinner decisions, made lighter.',
      }),
    ).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Primary mobile navigation' }),
    ).toBeInTheDocument()
    expect(screen.getByText('v2 test preview')).toBeVisible()
    expect(document.title).toBe('Home | Cooksmith')
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
    expect(document.title).toBe('Page not found | Cooksmith')
  })

  it('supports browser-compatible navigation and active route state', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')

    const pantryLinks = await screen.findAllByRole('link', { name: 'Pantry' })
    await user.click(pantryLinks[0]!)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pantry' })).toBeVisible()
    expect(pantryLinks.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true)
    expect(document.title).toBe('Pantry | Cooksmith')

    await act(() => router.navigate(-1))
    expect(
      await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' }),
    ).toBeVisible()
  })

  it('renders a calm route error boundary without raw error details', async () => {
    renderRouteError()

    expect(
      await screen.findByRole('heading', { name: 'That page did not come together' }),
    ).toBeVisible()
    expect(screen.queryByText('Controlled route test failure')).not.toBeInTheDocument()
  })

  it('moves keyboard focus through the skip link and primary action', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()

    await waitFor(() => expect(document.title).toBe('Home | Cooksmith'))
  })
})
