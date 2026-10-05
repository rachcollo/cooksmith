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
  measurementSystem: 'au',
  position: 0,
  updatedAt: '2026-10-04T00:00:00Z',
  ...extra,
})
function mount(initial: ShoppingItem[], refreshStructure?: ShoppingRepository['refreshStructure']) {
  let rows = initial
  const repository: ShoppingRepository = {
    list: async () => rows,
    refreshStructure,
    create: async () => {
      throw new Error('not used')
    },
    update: vi.fn(async (id: string, input: ShoppingItemInput) => {
      const updated = { ...rows.find((row) => row.id === id)!, ...input }
      rows = rows.map((row) => (row.id === id ? updated : row))
      return updated
    }),
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
          return input ? { ...row, ...input, manual: true, combineWithPlan: true } : row
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
  it('lets a shopper confirm the sizes of unresolved spoons in a combined purchase', async () => {
    const repository = mount([
      item('oil-volume', 'olive oil', 30, 'ml'),
      item('oil-spoon', 'olive oil', 2, 'tbsp', { measurementSystem: 'unknown' }),
    ])
    expect(await screen.findByText('30 ml + 2 tbsp')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Edit olive oil' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit olive oil' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Cup and spoon measures'), 'au')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('70 ml')).toBeVisible()
    expect(repository.updatePurchase).toHaveBeenCalledWith(householdId, [
      expect.objectContaining({ id: 'oil-volume', quantity: 30, unit: 'ml' }),
      expect.objectContaining({
        id: 'oil-spoon',
        quantity: 2,
        unit: 'tbsp',
        measurementSystem: 'au',
      }),
    ])
  })

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
  it('keeps a manual amount separate until the shopper explicitly includes it', async () => {
    const repository = mount([
      item('plan', 'plain flour', 150, 'g', {
        sourceQuantities: [
          {
            name: 'plain flour',
            quantity: '1',
            unit: 'cup',
            approximate: true,
            conversionId: 'taste-plain-flour-v1',
          },
        ],
      }),
      item('manual', 'plain flour', 50, 'g', { manual: true }),
    ])
    expect(await screen.findByText('about 150 g')).toBeVisible()
    expect(screen.getByText('50 g')).toBeVisible()
    const manualRow = screen.getByText('50 g').closest('li')!
    await userEvent.click(within(manualRow).getByRole('button', { name: 'Edit plain flour' }))
    await userEvent.click(
      within(manualRow).getByLabelText('Include in this product’s planned total'),
    )
    await userEvent.click(
      within(manualRow).getByRole('button', { name: 'Save changes to plain flour' }),
    )
    expect(await screen.findByText('about 200 g')).toBeVisible()
    expect(screen.getAllByText('plain flour', { exact: true })).toHaveLength(1)
    expect(repository.update).toHaveBeenCalledWith(
      'manual',
      expect.objectContaining({ combineWithPlan: true, quantity: 50 }),
    )
  })
})

describe('explicit recipe amount refresh', () => {
  it('reports a failed refresh without losing the visible saved list', async () => {
    const refresh = vi.fn(async () => {
      throw new Error('stale snapshot')
    })
    mount(
      [
        item('legacy', 'brown sugar', 55, 'g', {
          completed: true,
          sourceQuantities: [{ name: 'brown sugar', quantity: '55', unit: 'g' }],
        }),
      ],
      refresh,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Refresh recipe amounts' }))
    expect(await screen.findByText(/Cooksmith could not finish refreshing/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mark as needed: brown sugar' })).toBeVisible()
    expect(refresh).toHaveBeenCalledWith(householdId)
  })
})
