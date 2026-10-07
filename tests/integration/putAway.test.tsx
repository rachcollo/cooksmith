import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { ShoppingPutAway } from '../../src/routes/shopping/ShoppingPutAway'
import { ShoppingRepositoryContext } from '../../src/app/shopping/shoppingContext'
import { putAwayFixture } from '../fixtures/putAway'
import { PutAwayReviewError, type PutAwaySource } from '../../src/domain/shopping/putAway'

it('groups equivalent purchases, honours cancel, exclusions and corrected names', async () => {
  const f = putAwayFixture(),
    applied = vi.fn()
  render(
    <ShoppingRepositoryContext.Provider value={f.repository}>
      <ShoppingPutAway householdId="household" refreshKey="one" onApplied={applied} />
    </ShoppingRepositoryContext.Provider>,
  )
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Put shopping away' }))
  expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(f.applied.size).toBe(0)
  await user.click(screen.getByRole('button', { name: 'Put shopping away' }))
  await user.click(screen.getByRole('checkbox', { name: 'Include milk' }))
  const name = screen.getByRole('textbox', { name: 'Pantry name for apple' })
  await user.clear(name)
  await user.type(name, 'Green apples')
  await user.click(screen.getByRole('button', { name: 'Put selected items away' }))
  await screen.findByText('1 Pantry item is now available.')
  expect([...f.stock]).toEqual(['Green apples'])
  expect([...f.applied]).toEqual(['m:apples'])
  expect(applied).toHaveBeenCalledOnce()
  await user.click(screen.getByRole('button', { name: 'Put shopping away' }))
  expect(screen.getAllByRole('checkbox')).toHaveLength(1)
})
it('retries uncertain commit with the same operation, prevents duplicate submit and hides applied purchases after remount', async () => {
  const f = putAwayFixture(),
    command = f.repository.putAway!
  f.repository.putAway = vi.fn(async (...args: Parameters<typeof command>) => {
    const result = await command(...args)
    if (vi.mocked(f.repository.putAway!).mock.calls.length === 1) throw new Error('Lost response')
    return result
  })
  const tree = () => (
    <ShoppingRepositoryContext.Provider value={f.repository}>
      <ShoppingPutAway householdId="household" refreshKey="one" onApplied={() => undefined} />
    </ShoppingRepositoryContext.Provider>
  )
  const view = render(tree())
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Put shopping away' }))
  const form = screen.getByRole('button', { name: 'Put selected items away' }).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  await screen.findByText(/Could not confirm put-away/)
  expect(f.repository.putAway).toHaveBeenCalledOnce()
  expect(screen.getByRole('textbox', { name: 'Pantry name for milk' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Put selected items away' }))
  await screen.findByText('2 Pantry items are now available.')
  const calls = vi.mocked(f.repository.putAway!).mock.calls
  expect(calls[0]?.[1]).toBe(calls[1]?.[1])
  expect(f.stock.size).toBe(2)
  view.unmount()
  render(tree())
  await act(async () => Promise.resolve())
  expect(screen.queryByRole('button', { name: 'Put shopping away' })).not.toBeInTheDocument()
})
it('discards an old household draft and late eligibility response', async () => {
  const f = putAwayFixture()
  let finish!: (rows: PutAwaySource[]) => void
  const late = new Promise<PutAwaySource[]>((resolve) => {
    finish = resolve
  })
  f.repository.listPutAway = async (h) =>
    h === 'old' ? late : [{ key: 'm:new', token: 'new', name: 'New food', shoppingItemId: 'new' }]
  const tree = (h: string) => (
    <ShoppingRepositoryContext.Provider value={f.repository}>
      <ShoppingPutAway key={h} householdId={h} refreshKey="one" onApplied={() => undefined} />
    </ShoppingRepositoryContext.Provider>
  )
  const view = render(tree('old'))
  view.rerender(tree('new'))
  await userEvent.click(await screen.findByRole('button', { name: 'Put shopping away' }))
  await act(async () =>
    finish([{ key: 'm:old', token: 'old', name: 'Old food', shoppingItemId: 'old' }]),
  )
  await waitFor(() =>
    expect(within(screen.getByRole('dialog')).getByRole('textbox')).toHaveValue('new food'),
  )
})

it('unlocks corrections after a definite rejected review without treating it as an uncertain commit', async () => {
  const f = putAwayFixture()
  f.repository.putAway = vi.fn(async () => {
    throw new PutAwayReviewError('Use the exact Pantry name. Nothing was put away.')
  })
  render(
    <ShoppingRepositoryContext.Provider value={f.repository}>
      <ShoppingPutAway householdId="household" refreshKey="one" onApplied={() => undefined} />
    </ShoppingRepositoryContext.Provider>,
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Put shopping away' }))
  await userEvent.click(screen.getByRole('button', { name: 'Put selected items away' }))
  await screen.findByText('Use the exact Pantry name. Nothing was put away.')
  expect(screen.getByRole('textbox', { name: 'Pantry name for milk' })).toBeEnabled()
  expect(f.applied.size).toBe(0)
})
