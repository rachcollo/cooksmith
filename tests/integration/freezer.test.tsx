import { createSupabaseFreezerRepository } from '../../src/infrastructure/freezer/supabaseFreezerRepository'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'
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
  await userEvent.click(screen.getByRole('button', { name: 'Add meal' }))
  await userEvent.type(screen.getByRole('combobox', { name: 'Meal name' }), 'Old household draft')
  view.rerender(tree('new'))
  await userEvent.click(screen.getByRole('button', { name: /Freezer meals/ }))
  await screen.findByRole('heading', { name: 'New household soup' })
  await act(async () => finish([stock]))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Freezer curry' })).not.toBeInTheDocument()
})

it('shows a stale HTTP conflict and saves only after reviewing refreshed stock', async () => {
  const fixture = freezerFixture([stock])
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ error: { code: 'PT409' } })
    .mockResolvedValue({ error: null })
  const adapter = createSupabaseFreezerRepository({
    schema: () => ({ rpc }),
  } as unknown as CooksmithSupabaseClient)
  const list = vi
    .fn()
    .mockResolvedValueOnce([stock])
    .mockResolvedValue([{ ...stock, portions: 1, available: 1, revision: 1 }])
  const repository = { ...fixture.repository, command: adapter.command, list }
  render(
    <FreezerRepositoryContext.Provider value={repository}>
      <RecipeRepositoryContext.Provider value={defaultRecipeRepository}>
        <FreezerPanel householdId={stock.householdId} />
      </RecipeRepositoryContext.Provider>
    </FreezerRepositoryContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Freezer meals/ }))
  await userEvent.click(
    await screen.findByRole('button', { name: 'Edit freezer meal Freezer curry' }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save freezer meal' }))
  await screen.findByText(
    'Stock changed. Close this form, refresh and check the latest portions before editing.',
  )
  expect(rpc).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  await userEvent.click(screen.getByRole('button', { name: 'Refresh stock' }))
  await screen.findByText('Stock refreshed.')
  await userEvent.click(screen.getByRole('button', { name: 'Edit freezer meal Freezer curry' }))
  await userEvent.click(screen.getByRole('button', { name: 'Save freezer meal' }))
  await screen.findByText('Freezer stock saved.')
  expect(rpc.mock.calls[0]?.[1].p_payload.revision).toBe(0)
  expect(rpc.mock.calls[1]?.[1].p_payload).toMatchObject({ revision: 1, portions: 1 })
})

it.each(['household', 'public'] as const)(
  'links only an explicit %s recipe choice and keeps typed or manual names unlinked',
  async (scope) => {
    const fixture = freezerFixture()
    const recipe = {
      ...(await defaultRecipeRepository.list(stock.householdId))[0]!,
      id: '99000000-0000-4000-8000-000000000009',
      scope,
    }
    const recipes = {
      ...defaultRecipeRepository,
      list: async () => [
        recipe,
        {
          ...recipe,
          id: '99000000-0000-4000-8000-000000000010',
          name: 'Private soup',
          scope: 'private' as const,
        },
        {
          ...recipe,
          id: '99000000-0000-4000-8000-000000000011',
          name: 'Archived soup',
          archivedAt: '2026-10-01',
        },
      ],
    }
    const command = vi.spyOn(fixture.repository, 'command')
    render(
      <FreezerRepositoryContext.Provider value={fixture.repository}>
        <RecipeRepositoryContext.Provider value={recipes}>
          <FreezerPanel householdId={stock.householdId} />
        </RecipeRepositoryContext.Provider>
      </FreezerRepositoryContext.Provider>,
    )
    await screen.findByText('0 meals · 0 available')
    expect(screen.queryByRole('button', { name: 'Refresh stock' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add meal' }))
    const search = screen.getByRole('combobox', { name: 'Meal name' })
    await userEvent.type(search, 'soup')
    expect(screen.queryByRole('option', { name: /Private soup/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Archived soup/ })).not.toBeInTheDocument()
    await userEvent.click(
      await screen.findByRole('option', { name: /Lentil soup.*(Household|Shared)/ }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save freezer meal' }))
    await screen.findByText('Freezer stock saved.')
    expect(command.mock.calls[0]?.[1].payload).toMatchObject({
      name: 'Lentil soup',
      householdRecipeId: scope === 'household' ? recipe.id : null,
      importedRecipeId: scope === 'public' ? recipe.id : null,
    })
    await userEvent.click(screen.getByRole('button', { name: 'Edit freezer meal Lentil soup' }))
    await userEvent.clear(screen.getByRole('combobox', { name: 'Meal name' }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Meal name' }), 'My own soup')
    await userEvent.tab()
    expect(screen.getByRole('combobox', { name: 'Meal name' })).toHaveValue('My own soup')
    await userEvent.click(screen.getByRole('button', { name: 'Save freezer meal' }))
    await screen.findByRole('heading', { name: 'My own soup' })
    expect(command.mock.calls[1]?.[1].payload).toMatchObject({
      name: 'My own soup',
      householdRecipeId: null,
      importedRecipeId: null,
    })
  },
)

it('late recipe results preserve the query and explicit manual choice stays unlinked', async () => {
  const fixture = freezerFixture()
  let finish!: (rows: Awaited<ReturnType<typeof defaultRecipeRepository.list>>) => void
  const pending = new Promise<Awaited<ReturnType<typeof defaultRecipeRepository.list>>>(
    (resolve) => {
      finish = resolve
    },
  )
  const recipes = { ...defaultRecipeRepository, list: () => pending }
  render(
    <FreezerRepositoryContext.Provider value={fixture.repository}>
      <RecipeRepositoryContext.Provider value={recipes}>
        <FreezerPanel householdId={stock.householdId} />
      </RecipeRepositoryContext.Provider>
    </FreezerRepositoryContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Add meal' }))
  const search = screen.getByRole('combobox', { name: 'Meal name' })
  await userEvent.type(search, 'Lentil')
  await act(async () => finish(await defaultRecipeRepository.list(stock.householdId)))
  expect(search).toHaveValue('Lentil')
  await userEvent.click(screen.getByRole('option', { name: 'Add “Lentil” — manual meal' }))
  await userEvent.click(screen.getByRole('button', { name: 'Save freezer meal' }))
  await screen.findByRole('heading', { name: 'Lentil' })
  expect((await fixture.repository.list(stock.householdId))[0]?.householdRecipeId).toBeNull()
})

it('shows stock errors without a false zero count, retries and refreshes on return', async () => {
  const fixture = freezerFixture([stock])
  const list = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([stock])
  render(
    <FreezerRepositoryContext.Provider value={{ ...fixture.repository, list }}>
      <RecipeRepositoryContext.Provider
        value={{
          ...defaultRecipeRepository,
          list: async () => {
            throw new Error('offline')
          },
        }}
      >
        <FreezerPanel householdId={stock.householdId} />
      </RecipeRepositoryContext.Provider>
    </FreezerRepositoryContext.Provider>,
  )
  await screen.findByText('Stock unavailable')
  expect(screen.queryByText('0 meals · 0 available')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Retry stock' }))
  await screen.findByText('1 meal · 2 available')
  list.mockResolvedValue([{ ...stock, portions: 1, available: 1 }])
  fireEvent(window, new Event('focus'))
  await screen.findByText('1 meal · 1 available')
  await userEvent.click(screen.getByRole('button', { name: 'Add meal' }))
  await screen.findByText('Could not load recipes. You can still add a manual meal.')
  await userEvent.type(screen.getByRole('combobox', { name: 'Meal name' }), 'Homemade pasta')
  await userEvent.click(screen.getByRole('option', { name: 'Add “Homemade pasta” — manual meal' }))
  await userEvent.click(screen.getByRole('button', { name: 'Save freezer meal' }))
  await screen.findByText('Freezer stock saved.')
  expect(
    (await fixture.repository.list(stock.householdId)).some(
      (row) => row.name === 'Homemade pasta' && !row.householdRecipeId && !row.importedRecipeId,
    ),
  ).toBe(true)
})

it('ignores an older stock response after a return-to-app refresh', async () => {
  const fixture = freezerFixture()
  let finish!: (rows: FreezerMeal[]) => void
  const first = new Promise<FreezerMeal[]>((resolve) => {
    finish = resolve
  })
  const list = vi.fn().mockReturnValueOnce(first).mockResolvedValue([stock])
  render(
    <FreezerRepositoryContext.Provider value={{ ...fixture.repository, list }}>
      <RecipeRepositoryContext.Provider value={defaultRecipeRepository}>
        <FreezerPanel householdId={stock.householdId} />
      </RecipeRepositoryContext.Provider>
    </FreezerRepositoryContext.Provider>,
  )
  fireEvent(window, new Event('focus'))
  await screen.findByText('1 meal · 2 available')
  await act(async () => finish([]))
  expect(screen.getByText('1 meal · 2 available')).toBeVisible()
})
