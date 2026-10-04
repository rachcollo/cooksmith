import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { renderApp } from '../renderApp'
import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
import type { ShoppingItem, ShoppingItemInput } from '../../src/domain/shopping/types'
const householdId = '20000000-0000-4000-8000-000000000001'
const item = (
  id: string,
  name: string,
  quantity: number | null,
  unit: string | null,
  extra: Partial<ShoppingItem> = {},
): ShoppingItem => ({
  id,
  householdId,
  name,
  quantity,
  unit,
  category: 'pantry',
  completed: false,
  manual: false,
  position: 0,
  updatedAt: '2026-10-04T00:00:00Z',
  ...extra,
})
function mount(initial: ShoppingItem[]) {
  let rows = initial
  const repository: ShoppingRepository = {
    list: async () => rows,
    create: async () => {
      throw new Error('not used')
    },
    update: async () => {
      throw new Error('not used')
    },
    setCompleted: async () => {
      throw new Error('must use atomic group action')
    },
    remove: async () => {
      throw new Error('must use atomic group action')
    },
    setCompletedMany: vi.fn(async (_householdId, ids, completed) => {
      rows = rows.map((row) => (ids.includes(row.id) ? { ...row, completed } : row))
    }),
    removeMany: vi.fn(async (_householdId, ids) => {
      rows = rows.filter((row) => !ids.includes(row.id))
    }),
    updatePurchase: vi.fn(
      async (_householdId: string, inputs: (ShoppingItemInput & { id: string })[]) => {
        rows = rows.map((row) => {
          const input = inputs.find((input) => input.id === row.id)
          return input ? { ...row, ...input, manual: true } : row
        })
      },
    ),
  }
  renderApp(
    '/shopping',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    repository,
  )
  return repository
}
describe('clean combined purchases', () => {
  it('shows one row without recipe disclosures and completes/restores all source members', async () => {
    const repository = mount([
      item('s1', 'sea salt', 1, 'tsp'),
      item('s2', 'sea salt flakes', 50, 'g'),
      item('s3', 'sea salt flakes plus extra to taste', null, null),
    ])
    expect(await screen.findByText('sea salt flakes', { exact: true })).toBeVisible()
    expect(screen.getByText('5 ml + 50 g + to taste')).toBeVisible()
    expect(screen.queryByText('Recipe amounts')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Mark as done: sea salt flakes' })).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done: sea salt flakes' }))
    expect(
      await screen.findByRole('button', { name: 'Mark as needed: sea salt flakes' }),
    ).toBeVisible()
    expect(repository.setCompletedMany).toHaveBeenCalledWith(householdId, ['s1', 's2', 's3'], true)
    await userEvent.click(screen.getByRole('button', { name: 'Mark as needed: sea salt flakes' }))
    expect(
      await screen.findByRole('button', { name: 'Mark as done: sea salt flakes' }),
    ).toBeVisible()
    expect(repository.setCompletedMany).toHaveBeenLastCalledWith(
      householdId,
      ['s1', 's2', 's3'],
      false,
    )
  })
  it('edits the combined metric amount and removes the whole purchase with confirmation', async () => {
    const repository = mount([
      item('o1', 'extra virgin olive oil', 60, 'ml'),
      item('o2', 'extra virgin olive oil', 2, 'tsp'),
    ])
    expect(await screen.findByText('70 ml')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Edit extra virgin olive oil' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit extra virgin olive oil' })
    const quantity = within(dialog).getByLabelText('Quantity (ml)')
    expect(quantity).toHaveValue('70')
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '80')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('80 ml')).toBeVisible()
    expect(repository.updatePurchase).toHaveBeenCalledWith(householdId, [
      expect.objectContaining({ id: 'o1', quantity: 80, unit: 'ml' }),
      expect.objectContaining({ id: 'o2', quantity: 0, unit: 'ml' }),
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Remove extra virgin olive oil' }))
    expect(await screen.findByText('Your list is ready')).toBeVisible()
    expect(repository.removeMany).toHaveBeenCalledWith(householdId, ['o1', 'o2'])
  })
  it('keeps a partly-bought product in one place and excludes another household', async () => {
    mount([
      item('o1', 'extra virgin olive oil', 60, 'ml', { completed: true }),
      item('o2', 'extra virgin olive oil', 2, 'tsp'),
      item('foreign', 'Private product', 9, null, { householdId: 'other-household' }),
    ])
    expect(await screen.findByText('10 ml')).toBeVisible()
    expect(screen.getAllByText('extra virgin olive oil', { exact: true })).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.queryByText('Private product')).not.toBeInTheDocument()
  })
})
