import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp, renderRouteError } from '../renderApp'

const expectedDestinations = ['Home', 'Pantry', 'Recipes', 'Plan', 'Shopping', 'Get Ahead'] as const

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
    expect(screen.queryByText('v2 test preview')).not.toBeInTheDocument()
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
    await waitFor(() => expect(document.title).toBe('Pantry | Cooksmith'))

    await act(() => router.navigate(-1))
    expect(
      await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' }),
    ).toBeVisible()
  })

  it('preserves six mobile and seven desktop destinations in the approved order', async () => {
    renderApp('/')

    await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Primary mobile navigation',
    })
    const desktopNavigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    expect(
      Array.from(mobileNavigation.querySelectorAll('a, button')).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(expectedDestinations)
    expect(
      Array.from(desktopNavigation.querySelectorAll('a, button')).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual([...expectedDestinations, 'Settings'])
    expect(mobileNavigation).not.toHaveTextContent('Settings')
  })

  it('opens mobile settings and log out actions from the cog menu', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
    const accountMenuButton = screen.getByRole('button', { name: 'Open account menu' })

    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument()
    await user.click(accountMenuButton)

    const accountMenu = screen.getByRole('menu', { name: 'Account' })
    expect(accountMenuButton).toHaveAttribute('aria-expanded', 'true')
    expect(accountMenu).toContainElement(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(accountMenu).toContainElement(screen.getByRole('menuitem', { name: 'Log out' }))

    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Household members' }),
    ).toBeVisible()
    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument()
  })

  it('closes the mobile account menu with Escape and returns focus to the cog', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
    const accountMenuButton = screen.getByRole('button', { name: 'Open account menu' })
    await user.click(accountMenuButton)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument()
    expect(accountMenuButton).toHaveFocus()
  })

  it.each([
    ['/', 'Home'],
    ['/pantry', 'Pantry'],
    ['/recipes', 'Recipes'],
    ['/plan', 'Plan'],
    ['/shopping', 'Shopping'],
    ['/get-ahead', 'Get Ahead'],
    ['/settings', 'Settings'],
  ])('marks only %s as the active desktop destination', async (route, activeLabel) => {
    renderApp(route)

    const desktopNavigation = await screen.findByRole('navigation', {
      name: 'Primary navigation',
    })
    const activeDestinations = Array.from(
      desktopNavigation.querySelectorAll('[aria-current="page"]'),
    ).map((item) => item.textContent?.trim())

    expect(activeDestinations).toEqual([activeLabel])
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
