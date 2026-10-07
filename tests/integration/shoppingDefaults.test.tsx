import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { ShoppingDefaultsSection } from '../../src/routes/shopping/ShoppingDefaultsSection'
import { ShoppingRepositoryContext } from '../../src/app/shopping/shoppingContext'
import { defaultShoppingRepository } from '../renderApp'
import type { ShoppingPreset } from '../../src/domain/shopping/period'

it('loads the owner default, saves immediately once and keeps the previous value on failure', async () => {
  let finish!: () => void
  const save = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const repository = {
    ...defaultShoppingRepository,
    loadDefault: vi.fn(async () => 'week' as const),
    saveDefault: save,
    savePeriod: vi.fn(),
  }
  render(
    <ShoppingRepositoryContext.Provider value={repository}>
      <ShoppingDefaultsSection householdId="h" owner />
    </ShoppingRepositoryContext.Provider>,
  )
  const select = await screen.findByRole('combobox', { name: 'Default shopping period' })
  await userEvent.selectOptions(select, 'next3')
  expect(select).toBeDisabled()
  fireEvent.change(select, { target: { value: 'next5' } })
  expect(save).toHaveBeenCalledExactlyOnceWith('h', 'next3')
  await act(async () => finish())
  expect(select).toHaveValue('next3')
  expect(repository.savePeriod).not.toHaveBeenCalled()
  save.mockRejectedValueOnce(new Error('offline'))
  await userEvent.selectOptions(select, 'next5')
  expect(await screen.findByRole('alert')).toHaveTextContent('previous setting is unchanged')
  expect(select).toHaveValue('next3')
})

it('lets members read the default but not save it', async () => {
  const save = vi.fn()
  const repository = {
    ...defaultShoppingRepository,
    loadDefault: async () => 'next5' as const,
    saveDefault: save,
  }
  render(
    <ShoppingRepositoryContext.Provider value={repository}>
      <ShoppingDefaultsSection householdId="h" owner={false} />
    </ShoppingRepositoryContext.Provider>,
  )
  const select = await screen.findByRole('combobox', { name: 'Default shopping period' })
  expect(select).toHaveValue('next5')
  expect(select).toBeDisabled()
  fireEvent.change(select, { target: { value: 'week' } })
  expect(save).not.toHaveBeenCalled()
})

it('offers a deliberate load retry and ignores a previous household response', async () => {
  let finish!: (value: ShoppingPreset) => void
  const pending = new Promise<ShoppingPreset>((resolve) => {
    finish = resolve
  })
  const load = vi.fn(async (h: string) => (h === 'old' ? pending : ('next3' as const)))
  load.mockRejectedValueOnce(new Error('offline'))
  const repository = { ...defaultShoppingRepository, loadDefault: load, saveDefault: vi.fn() }
  const tree = (h: string) => (
    <ShoppingRepositoryContext.Provider value={repository}>
      <ShoppingDefaultsSection key={h} householdId={h} owner />
    </ShoppingRepositoryContext.Provider>
  )
  const app = render(tree('old'))
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
  app.rerender(tree('new'))
  const select = await screen.findByRole('combobox', { name: 'Default shopping period' })
  await act(async () => finish('week'))
  await waitFor(() => expect(select).toHaveValue('next3'))
  expect(repository.saveDefault).not.toHaveBeenCalled()
})
