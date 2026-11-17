import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HouseholdPeopleRepository } from '../../src/application/households/householdPeopleRepository'
import { authenticatedTestClient, renderApp, signedOutTestAuthState } from '../renderApp'

function repository(overrides: Partial<HouseholdPeopleRepository> = {}): HouseholdPeopleRepository {
  return {
    load: async (householdId) => ({
      householdId,
      currentUserRole: 'owner',
      members: [
        {
          id: 'owner-membership',
          userId: 'test-user',
          displayName: 'Owner Person',
          role: 'owner',
          joinedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'member-membership',
          userId: 'member-user',
          displayName: 'Member Person',
          role: 'member',
          joinedAt: '2026-02-01T00:00:00Z',
        },
      ],
      invitations: [
        {
          id: 'invitation-1',
          email: 'waiting@example.test',
          status: 'pending',
          expiresAt: '2026-08-01T00:00:00Z',
        },
      ],
    }),
    invite: async () => undefined,
    resend: async () => undefined,
    cancel: async () => undefined,
    removeMember: async () => undefined,
    accept: async () => 'household-1',
    ...overrides,
  }
}

describe('household people management', () => {
  beforeEach(() => sessionStorage.clear())
  it('lets an owner invite, resend, cancel and confirm member removal', async () => {
    const invite = vi.fn(async () => undefined)
    const resend = vi.fn(async () => undefined)
    const cancel = vi.fn(async () => undefined)
    const removeMember = vi.fn(async () => undefined)
    const people = repository({ invite, resend, cancel, removeMember })
    const user = userEvent.setup()
    renderApp('/settings', undefined, authenticatedTestClient, undefined, people)

    expect(await screen.findByRole('heading', { name: 'Household members' })).toBeVisible()
    await user.type(screen.getByLabelText('Email address'), 'new@example.test')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(invite).toHaveBeenCalledWith(expect.any(String), 'new@example.test'))

    await user.click(screen.getByRole('button', { name: 'Resend' }))
    await waitFor(() => expect(resend).toHaveBeenCalledWith('invitation-1'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('invitation-1'))

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.getByRole('dialog', { name: 'Remove household member?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Remove member' }))
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('member-membership'))
  })

  it('hides invitation and removal controls from a household member', async () => {
    const people = repository({
      load: async (householdId) => ({
        householdId,
        currentUserRole: 'member',
        members: [
          {
            id: 'member-membership',
            userId: 'test-user',
            displayName: 'Member Person',
            role: 'member',
            joinedAt: '2026-02-01T00:00:00Z',
          },
        ],
        invitations: [],
      }),
    })
    renderApp('/settings', undefined, authenticatedTestClient, undefined, people)
    expect(await screen.findByRole('heading', { name: 'Household members' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('accepts a valid invitation and enters the household', async () => {
    const accept = vi.fn(async () => 'household-1')
    const people = repository({ accept })
    const user = userEvent.setup()
    const token = 'a'.repeat(64)
    const { router } = renderApp(
      `/invitations/accept?token=${token}`,
      undefined,
      authenticatedTestClient,
      undefined,
      people,
    )
    await user.type(await screen.findByLabelText('Display name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Join household' }))
    await waitFor(() => expect(accept).toHaveBeenCalledWith(token, 'Alex'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
  it('opens passively, removes the token and starts auth only on explicit acceptance', async () => {
    const accept = vi.fn()
    const user = userEvent.setup()
    const { router } = renderApp(
      `/invitations/accept?token=${'a'.repeat(64)}`,
      undefined,
      null,
      undefined,
      repository({ accept }),
      undefined,
      undefined,
      signedOutTestAuthState,
    )
    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeVisible()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(accept).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/welcome'))
    expect(router.state.location.search).toBe('?returnTo=%2Finvitations%2Faccept')
    expect(accept).not.toHaveBeenCalled()
  })
  it('keeps failed acceptance recoverable and offers a different account', async () => {
    const accept = vi.fn(async () => {
      throw new Error('Sign in with the invited email.')
    })
    const user = userEvent.setup()
    renderApp(
      `/invitations/accept?token=${'a'.repeat(64)}`,
      undefined,
      authenticatedTestClient,
      undefined,
      repository({ accept }),
    )
    await user.type(await screen.findByLabelText('Display name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Join household' }))
    expect(await screen.findByText('Sign in with the invited email.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Use a different account' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Join household' })).toBeEnabled()
  })
  it('refreshes pending invitations after a delivery failure and preserves the address for recovery', async () => {
    const people = repository({
      invite: async () => {
        throw new Error('The email could not be confirmed. Use Resend.')
      },
    })
    const load = vi.fn(people.load)
    people.load = load
    const user = userEvent.setup()
    renderApp('/settings', undefined, authenticatedTestClient, undefined, people)
    await user.type(await screen.findByLabelText('Email address'), 'retry@example.test')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('The email could not be confirmed. Use Resend.')).toBeVisible()
    await waitFor(() => expect(load.mock.calls.length).toBeGreaterThan(1))
    expect(screen.getByLabelText('Email address')).toHaveValue('retry@example.test')
    expect(screen.getByRole('button', { name: 'Resend' })).toBeEnabled()
  })
})
