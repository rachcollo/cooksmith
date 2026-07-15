import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { HouseholdPeopleRepository } from '../../src/application/households/householdPeopleRepository'
import { authenticatedTestClient, renderApp } from '../renderApp'

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
})
