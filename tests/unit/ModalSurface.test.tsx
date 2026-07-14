import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from '../../src/components/ui/Button'
import { Dialog } from '../../src/components/ui/Dialog'
import { Sheet } from '../../src/components/ui/Sheet'

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open details</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Foundation details">
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Dialog>
    </>
  )
}

function SheetHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open sheet</Button>
      <Sheet open={open} onOpenChange={setOpen} title="Useful actions">
        <p>Sheet content</p>
      </Sheet>
    </>
  )
}

describe('Modal surfaces', () => {
  it('moves focus into a dialog, closes on Escape and returns focus', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open details' })

    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Foundation details' })
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'Close Foundation details' })).toHaveFocus()

    act(() => dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
    expect(dialog).not.toHaveAttribute('open')
    expect(trigger).toHaveFocus()
  })

  it('closes a sheet through its named close control', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)

    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    const sheet = screen.getByRole('dialog', { name: 'Useful actions' })
    await user.click(screen.getByRole('button', { name: 'Close Useful actions' }))

    expect(sheet).not.toHaveAttribute('open')
  })
})
