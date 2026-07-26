import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../../src/components/ui/Button'
import { Panel } from '../../src/components/ui/Panel'
import { Tag } from '../../src/components/ui/Tag'

describe('Orchard shared component contracts', () => {
  it('keeps accent actions semantic and operable', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button variant="accent" onClick={onClick}>
        Generate my week
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Generate my week' })
    expect(button).toHaveClass('button-accent')
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('preserves a busy button name while preventing repeat submission', () => {
    render(
      <Button busy busyLabel="Saving changes">
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Saving changes' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('provides a colour-independent destructive treatment', () => {
    render(
      <Button variant="secondary" tone="destructive">
        Remove member
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Remove member' })).toHaveClass('button-destructive')
  })

  it('renders a feature panel without changing its content semantics', () => {
    render(
      <Panel tone="feature" aria-label="Get Ahead">
        Prepare dinner earlier
      </Panel>,
    )

    expect(screen.getByLabelText('Get Ahead')).toHaveClass('panel-feature')
    expect(screen.getByText('Prepare dinner earlier')).toBeVisible()
  })

  it('accepts arbitrary tag labels rather than a fixed taxonomy', () => {
    render(<Tag label="Nan’s Sunday favourite" tone="lilac" />)

    expect(screen.getByText('Nan’s Sunday favourite')).toHaveClass('tag-lilac')
  })
})
