import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NumericField } from '../../src/components/ui/NumericField'
import { parseNumericFieldValue } from '../../src/components/ui/numericFieldValue'

describe('numeric field values', () => {
  it.each([
    ['1.5', 1.5],
    ['0.5', 0.5],
    ['0.25', 0.25],
    [' 1,5 ', 1.5],
    ['.5', 0.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    ['1½', 1.5],
    ['¼', 0.25],
    ['⅓', 1 / 3],
    ['0', 0],
  ])('parses %s without changing the draft', (raw, value) => {
    expect(parseNumericFieldValue(raw)).toEqual({ raw, value, valid: true, error: undefined })
  })
  it.each([
    '1.',
    '1,',
    '/',
    '1/',
    '1/0',
    'NaN',
    'Infinity',
    '-1',
    '1,2,3',
    '1.2.3',
    'abc',
    '0x10',
    '1e3',
    '9'.repeat(400),
  ])('rejects %s without NaN', (raw) => {
    expect(parseNumericFieldValue(raw)).toMatchObject({ raw, value: null, valid: false })
  })
  it('distinguishes optional empty values and respects caller limits', () => {
    expect(parseNumericFieldValue('  ')).toMatchObject({ value: null, valid: true })
    expect(parseNumericFieldValue('', { required: true }).valid).toBe(false)
    expect(parseNumericFieldValue('99999', { max: 99999 }).valid).toBe(true)
    expect(parseNumericFieldValue('100000', { max: 99999 }).valid).toBe(false)
    expect(parseNumericFieldValue('0', { min: 1 }).valid).toBe(false)
    expect(parseNumericFieldValue('1/2', { integer: true }).valid).toBe(false)
  })
})

describe('NumericField', () => {
  it('retains intermediate text, exposes validity and prevents invalid native submission', async () => {
    const user = userEvent.setup()
    const changed = vi.fn()
    const submitted = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={submitted}>
        <NumericField label="Amount" name="amount" required onValueChange={changed} />
        <button>Save</button>
      </form>,
    )
    const input = screen.getByLabelText('Amount')
    await user.type(input, '1.')
    expect(input).toHaveValue('1.')
    expect(input).toHaveAccessibleDescription('Enter a number or fraction, such as 1.5 or 1/2.')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(submitted).not.toHaveBeenCalled()
    await user.type(input, '5')
    expect(input).toHaveValue('1.5')
    expect(changed).toHaveBeenLastCalledWith({
      raw: '1.5',
      value: 1.5,
      valid: true,
      error: undefined,
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(submitted).toHaveBeenCalledOnce()
    await user.clear(input)
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ value: null, valid: false }))
  })
  it('supports paste, external errors, updated limits and explicit draft reset', () => {
    const changed = vi.fn()
    const { rerender } = render(
      <NumericField label="Amount" defaultValue="1" onValueChange={changed} />,
    )
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: ' 1,5 ' } })
    expect(screen.getByLabelText('Amount')).toHaveValue(' 1,5 ')
    rerender(<NumericField label="Amount" max={1} onValueChange={changed} />)
    expect(screen.getByLabelText('Amount')).toBeInvalid()
    rerender(
      <NumericField
        key="new"
        label="Amount"
        defaultValue="2"
        error="Cannot save this amount."
        onValueChange={changed}
      />,
    )
    expect(screen.getByLabelText('Amount')).toHaveValue('2')
    expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription('Cannot save this amount.')
    expect(screen.getByLabelText('Amount')).toBeInvalid()
  })
})
