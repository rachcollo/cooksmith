import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../../src/components/ui/Button'
import { IconButton } from '../../src/components/ui/IconButton'

describe('Button', () => {
  it('runs its action when available', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Continue</Button>)

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('prevents disabled and busy actions', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Continue
      </Button>,
    )

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onClick).not.toHaveBeenCalled()

    rerender(
      <Button busy busyLabel="Saving" onClick={onClick}>
        Continue
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveAttribute('aria-busy', 'true')
  })

  it('requires an accessible name for an icon control', () => {
    render(<IconButton aria-label="Open menu">☰</IconButton>)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeVisible()
  })
})
