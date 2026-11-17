import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog'
import { Dialog } from '../../src/components/ui/Dialog'
import { Sheet } from '../../src/components/ui/Sheet'

for (const Surface of [Dialog, Sheet]) {
  describe(Surface.name, () => {
    it('keeps the draft and native dialog open on veto, then closes and reopens repeatedly', async () => {
      const requested = vi.fn()
      function Harness() {
        const [open, setOpen] = useState(false)
        const [allow, setAllow] = useState(false)
        return (
          <>
            <button onClick={() => setOpen(true)}>Open</button>
            <Surface
              open={open}
              title="Edit"
              onOpenChange={(next) => {
                requested(next)
                if (allow) setOpen(next)
              }}
            >
              <input aria-label="Draft" data-autofocus defaultValue="Original" />
              <button onClick={() => setAllow(true)}>Allow close</button>
              <button onClick={() => setOpen(false)}>Save</button>
            </Surface>
          </>
        )
      }
      const user = userEvent.setup()
      render(<Harness />)
      const trigger = screen.getByRole('button', { name: 'Open' })
      await user.click(trigger)
      const surface = screen.getByRole('dialog', { name: 'Edit' })
      const draft = screen.getByLabelText('Draft')
      expect(draft).toHaveFocus()
      await user.type(draft, ' draft')
      await user.click(screen.getByRole('button', { name: 'Close Edit' }))
      expect(surface).toHaveAttribute('open')
      const cancel = new Event('cancel', { cancelable: true })
      act(() => surface.dispatchEvent(cancel))
      expect(cancel.defaultPrevented).toBe(true)
      expect(surface).toHaveAttribute('open')
      expect(draft).toHaveValue('Original draft')
      expect(requested).toHaveBeenCalledTimes(2)
      await user.click(screen.getByRole('button', { name: 'Allow close' }))
      act(() => surface.dispatchEvent(new Event('cancel', { cancelable: true })))
      expect(trigger).toHaveFocus()
      expect(surface).not.toHaveAttribute('open')
      expect(requested).toHaveBeenCalledTimes(3)
      for (let i = 0; i < 2; i++) {
        await user.click(trigger)
        expect(surface).toHaveAttribute('open')
        await user.click(screen.getByRole('button', { name: 'Close Edit' }))
        expect(surface).not.toHaveAttribute('open')
        expect(trigger).toHaveFocus()
      }
      await user.click(trigger)
      const requestsBeforeSave = requested.mock.calls.length
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(requested).toHaveBeenCalledTimes(requestsBeforeSave)
      expect(trigger).toHaveFocus()
    })
  })
}

it('confirmation focuses the safe action, reports explicit confirmation and respects busy state', async () => {
  const user = userEvent.setup()
  const confirm = vi.fn()
  const change = vi.fn()
  const props = {
    title: 'Remove item?',
    description: 'This removes the item.',
    confirmLabel: 'Remove',
    onConfirm: confirm,
    onOpenChange: change,
  }
  const { rerender } = render(<ConfirmationDialog {...props} open />)
  expect(screen.getByRole('dialog')).toHaveAccessibleDescription(props.description)
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Remove' }))
  expect(confirm).toHaveBeenCalledOnce()
  expect(change).not.toHaveBeenCalled()
  rerender(<ConfirmationDialog {...props} open busy />)
  await user.click(screen.getByRole('button', { name: 'Close Remove item?' }))
  act(() => screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true })))
  expect(change).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Working' })).toBeDisabled()
  rerender(<ConfirmationDialog {...props} open />)
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(change).toHaveBeenCalledWith(false)
  expect(confirm).toHaveBeenCalledOnce()
})

it('does not let a queued native close event close a newly reopened dialog', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  const { rerender, unmount } = render(
    <>
      <button>Trigger</button>
      <Dialog open={false} title="Draft" onOpenChange={change}>
        <input aria-label="Draft text" data-autofocus />
      </Dialog>
    </>,
  )
  const trigger = screen.getByRole('button', { name: 'Trigger' })
  await user.click(trigger)
  rerender(
    <>
      <button>Trigger</button>
      <Dialog open title="Draft" onOpenChange={change}>
        <input aria-label="Draft text" data-autofocus />
      </Dialog>
    </>,
  )
  const dialog = screen.getByRole('dialog')
  rerender(
    <>
      <button>Trigger</button>
      <Dialog open={false} title="Draft" onOpenChange={change}>
        <input aria-label="Draft text" data-autofocus />
      </Dialog>
    </>,
  )
  rerender(
    <>
      <button>Trigger</button>
      <Dialog open title="Draft" onOpenChange={change}>
        <input aria-label="Draft text" data-autofocus />
      </Dialog>
    </>,
  )
  act(() => dialog.dispatchEvent(new Event('close')))
  expect(dialog).toHaveAttribute('open')
  expect(screen.getByLabelText('Draft text')).toHaveFocus()
  expect(change).not.toHaveBeenCalled()
  unmount()
  expect(dialog).not.toHaveAttribute('open')
})
