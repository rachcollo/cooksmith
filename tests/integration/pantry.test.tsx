import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderApp } from '../renderApp'
import type { PantryRepository } from '../../src/application/pantry/pantryRepository'

describe('pantry foundation', () => {
  it('shows default household pantry items and adds a new item', async () => {
    const create = vi.fn(async (householdId, input) => ({
      id: 'new-item',
      householdId,
      ...input,
      isDefault: false,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies PantryRepository['create']
    const repository: PantryRepository = {
      list: async (householdId) => [
        {
          id: 'default-flour',
          householdId,
          name: 'Plain flour',
          category: 'baking',
          quantity: 1,
          unit: 'kg',
          available: true,
          isDefault: true,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      create,
      update: async () => {
        throw new Error('not expected')
      },
      remove: async () => undefined,
    }

    renderApp('/pantry', undefined, undefined, undefined, undefined, repository)
    expect(await screen.findByRole('heading', { level: 1, name: 'Pantry' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Plain flour' })).toBeVisible()

    await userEvent.type(screen.getByLabelText('Item name'), 'Brown rice')
    await userEvent.clear(screen.getByLabelText(/Quantity/))
    await userEvent.type(screen.getByLabelText(/Quantity/), '2')
    await userEvent.clear(screen.getByLabelText(/Unit/))
    await userEvent.type(screen.getByLabelText(/Unit/), 'kg')
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }))

    expect(create).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000001', {
      name: 'Brown rice',
      category: 'other',
      quantity: 2,
      unit: 'kg',
      available: true,
    })
    expect(await screen.findByRole('heading', { name: 'Brown rice' })).toBeVisible()
  })
})
