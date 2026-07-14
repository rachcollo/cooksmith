import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState } from '../../src/components/ui/EmptyState'
import { ErrorState } from '../../src/components/ui/ErrorState'

describe('State patterns', () => {
  it('provides a working primary action from an empty state', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <EmptyState
        action={<button onClick={onAction}>Add something</button>}
        message="There is nothing here."
        title="Ready when you are"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add something' }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('provides a working recovery action from an error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ErrorState
        actionLabel="Try again"
        message="The section could not load."
        onAction={onRetry}
        title="Not quite ready"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
