import { MemoryRouter } from 'react-router-dom'
import { OnboardingContext } from '../../src/app/onboarding/onboardingContext'
import { ShoppingRepositoryContext } from '../../src/app/shopping/shoppingContext'
import { PantryRepositoryContext } from '../../src/app/pantry/pantryContext'
import { ShoppingPage } from '../../src/routes/ShoppingPage'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import {
  completedOnboardingRepository,
  defaultPantryRepository,
  defaultShoppingRepository,
  renderApp,
} from '../renderApp'
import { defaultShoppingPeriod, type ShoppingPeriodView } from '../../src/domain/shopping/period'

it('auto-applies a preset, suppresses rapid duplicate changes and recovers from failure', async () => {
  let view: ShoppingPeriodView = {
    period: defaultShoppingPeriod(),
    items: [],
    description: 'Full active week. 0 planned meals included.',
    notice: null,
  }
  let resolve!: () => void
  const save = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done
      }),
  )
  const repo = {
    ...defaultShoppingRepository,
    loadPeriod: vi.fn(async () => view),
    savePeriod: save,
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
    repo,
  )
  await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Buy for' }), 'next3')
  expect(screen.queryByRole('button', { name: 'Apply period' })).not.toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Buy for' })).toBeDisabled()
  fireEvent.change(screen.getByRole('combobox', { name: 'Buy for' }), {
    target: { value: 'next5' },
  })
  expect(save).toHaveBeenCalledOnce()
  view = {
    ...view,
    period: { ...view.period, kind: 'next3' },
    description: 'Next 3 planned meals selected.',
  }
  resolve()
  await screen.findByText('Next 3 planned meals selected.')
  expect(screen.getByRole('combobox', { name: 'Buy for' })).toHaveFocus()
  save.mockRejectedValueOnce(new Error('offline'))
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Buy for' }), 'next5')
  expect(await screen.findByText(/previous list is still available/)).toBeVisible()
  expect(screen.getByText('Next 3 planned meals selected.')).toBeVisible()
  view = {
    ...view,
    description: 'Another member chose the full week.',
    period: { ...view.period, kind: 'week' },
  }
  ;(document.activeElement as HTMLElement).blur()
  fireEvent.focus(window)
  await waitFor(() => expect(screen.getByText('Another member chose the full week.')).toBeVisible())
})

it('clears an old household period and ignores its late response after switching', async () => {
  const view: ShoppingPeriodView = {
    period: defaultShoppingPeriod(),
    items: [],
    description: 'New household shopping period',
    notice: null,
  }
  let finish!: (value: ShoppingPeriodView) => void
  const old = new Promise<ShoppingPeriodView>((resolve) => {
    finish = resolve
  })
  const repository = {
    ...defaultShoppingRepository,
    loadPeriod: async (h: string) => (h === 'old' ? old : view),
    savePeriod: vi.fn(async () => undefined),
  }
  const tree = (householdId: string) => (
    <MemoryRouter>
      <OnboardingContext.Provider
        value={{
          state: { householdId, step: 5, complete: true },
          repository: completedOnboardingRepository,
          refresh: () => completedOnboardingRepository.load('user'),
        }}
      >
        <ShoppingRepositoryContext.Provider value={repository}>
          <PantryRepositoryContext.Provider value={defaultPantryRepository}>
            <ShoppingPage />
          </PantryRepositoryContext.Provider>
        </ShoppingRepositoryContext.Provider>
      </OnboardingContext.Provider>
    </MemoryRouter>
  )
  const rendered = render(tree('old'))
  rendered.rerender(tree('new'))
  await screen.findByText('New household shopping period')
  await act(async () => finish({ ...view, description: 'Old household shopping period' }))
  expect(screen.queryByText('Old household shopping period')).not.toBeInTheDocument()
  expect(repository.savePeriod).not.toHaveBeenCalled()
})

it.each(['resolve', 'reject'])(
  'ignores a stale background %s after an automatic selection',
  async (outcome) => {
    let current: ShoppingPeriodView = {
      period: defaultShoppingPeriod(),
      items: [],
      description: 'Initial range',
      notice: null,
    }
    let finish!: (view: ShoppingPeriodView) => void
    let fail!: (error: Error) => void
    const pending = new Promise<ShoppingPeriodView>((resolve, reject) => {
      finish = resolve
      fail = reject
    })
    const load = vi
      .fn(async () => current)
      .mockImplementationOnce(async () => current)
      .mockImplementationOnce(() => pending)
    const repository = {
      ...defaultShoppingRepository,
      loadPeriod: load,
      savePeriod: vi.fn(async () => {
        current = {
          ...current,
          period: { ...current.period, kind: 'next3' },
          description: 'Latest selected range',
        }
      }),
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
    await screen.findByText('Initial range')
    fireEvent.focus(window)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Buy for' }), 'next3')
    await screen.findByText('Latest selected range')
    await act(async () => {
      if (outcome === 'resolve') finish({ ...current, description: 'Stale range' })
      else fail(new Error('stale offline'))
    })
    expect(screen.queryByText('Stale range')).not.toBeInTheDocument()
    expect(screen.queryByText(/Could not refresh the shared/)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Buy for' })).toHaveValue('next3')
  },
)
