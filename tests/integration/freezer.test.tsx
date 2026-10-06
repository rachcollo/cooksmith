import { FreezerPanel } from '../../src/routes/freezer/FreezerPanel'
import { FreezerRepositoryContext } from '../../src/app/freezer/freezerContext'
import { RecipeRepositoryContext } from '../../src/app/recipes/recipeContext'
import { defaultRecipeRepository } from '../renderApp'
import type { FreezerMeal } from '../../src/domain/freezer/types'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { defaultShoppingRepository, renderApp } from '../renderApp'
import { freezerFixture } from '../fixtures/freezer'
const stock = {
  id: '99000000-0000-4000-8000-000000000001',
  householdId: '20000000-0000-4000-8000-000000000001',
  name: 'Freezer curry',
  portions: 2,
  reserved: 0,
  available: 2,
  frozenOn: '2026-10-06',
  useFirstOn: null,
  notes: null,
  householdRecipeId: null,
  importedRecipeId: null,
  archivedAt: null,
  revision: 0,
}
it('recovers an uncertain reservation with the same operation and no Shopping generation', async () => {
  const fixture = freezerFixture([stock])
  const command = fixture.repository.command
  fixture.repository.command = vi.fn(async (...args: Parameters<typeof command>) => {
    await command(...args)
    if (vi.mocked(fixture.repository.command).mock.calls.length === 1)
      throw new Error('Response lost; retry unchanged.')
  })
  const contribute = vi.fn(async () => undefined)
  renderApp(
    '/plan',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    fixture.planner,
    undefined,
    undefined,
    { ...defaultShoppingRepository, createFromPlan: contribute },
    undefined,
    undefined,
    undefined,
    fixture.repository,
  )
  await userEvent.click((await screen.findAllByRole('button', { name: 'Add dinner' }))[0]!)
  await userEvent.type(screen.getByRole('combobox'), 'curry')
  await userEvent.click(await screen.findByRole('option', { name: /Freezer curry.*Freezer/ }))
  const form = screen.getByRole('button', { name: 'Save dinner' }).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  await screen.findByText('Response lost; retry unchanged.')
  expect(fixture.repository.command).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Save dinner' }))
  await screen.findByRole('button', { name: 'Mark used Freezer curry' })
  const calls = vi.mocked(fixture.repository.command).mock.calls
  expect(calls[0]?.[1].operationId).toBe(calls[1]?.[1].operationId)
  expect(fixture.plans).toHaveLength(1)
  expect(contribute).not.toHaveBeenCalled()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Mark used Freezer curry' }))
  await screen.findByRole('button', { name: 'Undo use Freezer curry' })
  expect((await fixture.repository.list(fixture.householdId))[0]?.portions).toBe(1)
  await userEvent.click(screen.getByRole('button', { name: 'Undo use Freezer curry' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Mark used Freezer curry' })).toBeVisible(),
  )
  expect((await fixture.repository.list(fixture.householdId))[0]?.portions).toBe(2)
})

it('discards the old freezer form and late stock response when the household changes', async () => {
  let finish!: (rows: FreezerMeal[]) => void
  const old = new Promise<FreezerMeal[]>((resolve) => {
    finish = resolve
  })
  const fixture = freezerFixture()
  const repository = {
    ...fixture.repository,
    list: async (h: string) =>
      h === 'old' ? old : [{ ...stock, name: 'New household soup', householdId: 'new' }],
  }
  const tree = (h: string) => (
    <FreezerRepositoryContext.Provider value={repository}>
      <RecipeRepositoryContext.Provider value={defaultRecipeRepository}>
        <FreezerPanel key={h} householdId={h} />
      </RecipeRepositoryContext.Provider>
    </FreezerRepositoryContext.Provider>
  )
  const view = render(tree('old'))
  await userEvent.click(screen.getByRole('button', { name: 'Add freezer meal' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Meal name' }), 'Old household draft')
  view.rerender(tree('new'))
  await screen.findByRole('heading', { name: 'New household soup' })
  await act(async () => finish([stock]))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Freezer curry' })).not.toBeInTheDocument()
})
