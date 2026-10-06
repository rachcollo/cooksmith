import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { renderApp, defaultShoppingRepository, defaultFeatureFlagRepository } from '../renderApp'
import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'

function mount(
  refreshStructure: NonNullable<ShoppingRepository['refreshStructure']>,
  isAdmin = vi.fn(async () => true),
  path = '/admin',
) {
  return renderApp(
    path,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { ...defaultShoppingRepository, refreshStructure },
    { ...defaultFeatureFlagRepository, isAdmin },
  )
}
it('runs bounded household repair only on an explicit admin click and reports incomplete work', async () => {
  const refresh = vi.fn(async () => ({ refreshed: 2, skipped: 1 }))
  const { router } = mount(refresh)
  const button = await screen.findByRole('button', { name: 'Repair older Shopping amounts' })
  expect(refresh).not.toHaveBeenCalled()
  await userEvent.click(button)
  expect(await screen.findByText(/2 meals. 1 meal was skipped or deferred/)).toBeVisible()
  expect(refresh).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000001')
  await act(async () => {
    await router.navigate('/shopping')
  })
  expect(screen.queryByRole('button', { name: 'Refresh recipe amounts' })).not.toBeInTheDocument()
  await act(async () => {
    await router.navigate('/admin')
  })
  await screen.findByRole('button', { name: 'Repair older Shopping amounts' })
  expect(refresh).toHaveBeenCalledTimes(1)
})
it('does not retry a network/conflict failure automatically and handles a deliberate no-op retry', async () => {
  const refresh = vi
    .fn<NonNullable<ShoppingRepository['refreshStructure']>>()
    .mockRejectedValueOnce(new Error('network or stale snapshot'))
    .mockResolvedValue({ refreshed: 0, skipped: 0 })
  mount(refresh)
  await userEvent.click(
    await screen.findByRole('button', { name: 'Repair older Shopping amounts' }),
  )
  await screen.findByText(/Repair could not finish/)
  expect(refresh).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Repair older Shopping amounts' }))
  await screen.findByText('No older recipe amounts need repair. No purchases were changed.')
  expect(refresh).toHaveBeenCalledTimes(2)
})
it('rechecks admin permission and never starts repair after permission loss', async () => {
  const refresh = vi.fn(async () => ({ refreshed: 1, skipped: 0 }))
  const isAdmin = vi.fn(async () => true)
  mount(refresh, isAdmin)
  const button = await screen.findByRole('button', { name: 'Repair older Shopping amounts' })
  isAdmin.mockResolvedValue(false)
  await userEvent.click(button)
  await screen.findByText('Administrator access is required. No repair was started.')
  expect(refresh).not.toHaveBeenCalled()
})
it('hides release maintenance from a non-admin and from normal Shopping opens', async () => {
  const refresh = vi.fn(async () => ({ refreshed: 1, skipped: 0 }))
  mount(
    refresh,
    vi.fn(async () => false),
  )
  await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
  expect(
    screen.queryByRole('button', { name: 'Repair older Shopping amounts' }),
  ).not.toBeInTheDocument()
  expect(refresh).not.toHaveBeenCalled()
})
it('ignores double clicks while a repair is in flight', async () => {
  let finish!: (value: { refreshed: number; skipped: number }) => void
  const refresh = vi.fn(
    () =>
      new Promise<{ refreshed: number; skipped: number }>((resolve) => {
        finish = resolve
      }),
  )
  mount(refresh)
  const button = await screen.findByRole('button', { name: 'Repair older Shopping amounts' })
  await userEvent.dblClick(button)
  expect(refresh).toHaveBeenCalledTimes(1)
  await act(async () => {
    finish({ refreshed: 1, skipped: 0 })
  })
  await screen.findByText('Updated 1 meal. Household edits and bought items were preserved.')
})

it('does not start an old action after navigating away during the permission check', async () => {
  let allow!: (value: boolean) => void
  const refresh = vi.fn(async () => ({ refreshed: 1, skipped: 0 }))
  const isAdmin = vi.fn(async () => true)
  const { router } = mount(refresh, isAdmin)
  const button = await screen.findByRole('button', { name: 'Repair older Shopping amounts' })
  isAdmin.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        allow = resolve
      }),
  )
  await userEvent.click(button)
  await act(async () => {
    await router.navigate('/shopping')
  })
  await act(async () => {
    allow(true)
  })
  expect(refresh).not.toHaveBeenCalled()
})
