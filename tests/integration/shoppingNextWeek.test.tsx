import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ShoppingPeriodControl } from '../../src/routes/shopping/ShoppingPeriodControl'
import { chooseShoppingPeriod, shoppingPeriodView } from '../../src/domain/shopping/period'

afterEach(() => vi.useRealTimers())

it('saves next week from custom dates, retains the draft on failure and shows the saved range on reload', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 8, 9, 29))
  const view = shoppingPeriodView([], chooseShoppingPeriod('week'), [])
  const onSave = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(undefined)
  const app = render(<ShoppingPeriodControl view={view} busy={false} onSave={onSave} />)
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Buy for' }), 'custom')
  fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-09' } })
  fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-15' } })
  expect(screen.getByLabelText('From date')).not.toHaveAttribute('max')
  await userEvent.click(screen.getByRole('button', { name: 'Save dates' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('previous list is still available')
  expect(screen.getByLabelText('From date')).toHaveValue('2026-11-09')
  expect(screen.getByLabelText('To date')).toHaveValue('2026-11-15')
  await userEvent.click(screen.getByRole('button', { name: 'Save dates' }))
  const saved = {
    kind: 'custom' as const,
    weekStart: '2026-11-09',
    from: '2026-11-09',
    to: '2026-11-15',
  }
  await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(saved))
  expect(onSave).toHaveBeenCalledTimes(2)
  app.rerender(
    <ShoppingPeriodControl view={shoppingPeriodView([], saved, [])} busy={false} onSave={onSave} />,
  )
  expect(screen.getByRole('status')).toHaveTextContent('9 Nov–15 Nov')
  expect(screen.getByRole('combobox', { name: 'Buy for' })).toHaveValue('custom')
})

it('starts with next week, auto-applies its preset and retains custom dates from the displayed range', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 8, 9, 29))
  const onSave = vi.fn(async () => undefined)
  render(
    <ShoppingPeriodControl view={shoppingPeriodView([], null, [])} busy={false} onSave={onSave} />,
  )
  const select = screen.getByRole('combobox', { name: 'Buy for' })
  expect(select).toHaveValue('default')
  expect(screen.getByRole('option', { name: 'Household default (Next week)' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('9 Nov–15 Nov')
  await userEvent.selectOptions(select, 'nextWeek')
  expect(onSave).toHaveBeenCalledExactlyOnceWith(chooseShoppingPeriod('nextWeek'))
  expect(screen.queryByRole('button', { name: 'Save dates' })).not.toBeInTheDocument()
  await userEvent.selectOptions(select, 'custom')
  expect(screen.getByLabelText('From date')).toHaveValue('2026-11-09')
  expect(screen.getByLabelText('To date')).toHaveValue('2026-11-15')
})

it('explains invalid custom dates without saving and allows correction', async () => {
  const onSave = vi.fn(async () => undefined)
  render(
    <ShoppingPeriodControl view={shoppingPeriodView([], null, [])} busy={false} onSave={onSave} />,
  )
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Buy for' }), 'custom')
  fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-15' } })
  fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-09' } })
  await userEvent.click(screen.getByRole('button', { name: 'Save dates' }))
  expect(screen.getByRole('alert')).toHaveTextContent('end on or after the start')
  expect(onSave).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-09' } })
  fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-16' } })
  await userEvent.click(screen.getByRole('button', { name: 'Save dates' }))
  expect(screen.getByRole('alert')).toHaveTextContent('same Monday-to-Sunday week')
  expect(onSave).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-15' } })
  await userEvent.click(screen.getByRole('button', { name: 'Save dates' }))
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
