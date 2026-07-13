import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TextField } from '../../src/components/ui/TextField'

describe('TextField', () => {
  it('connects a validation error to its labelled control', () => {
    render(<TextField label="Household name" error="Enter a household name" />)

    const input = screen.getByRole('textbox', { name: 'Household name' })
    const error = screen.getByRole('alert')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a household name')
    expect(error).toHaveTextContent('Enter a household name')
  })
})
