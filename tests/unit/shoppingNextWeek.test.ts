import { describe, expect, it } from 'vitest'
import {
  defaultShoppingPeriod,
  chooseShoppingPeriod,
  resolveShoppingPeriod,
  validShoppingPeriod,
  type ShoppingPeriod,
} from '../../src/domain/shopping/period'

const sunday = new Date(2026, 10, 8, 9, 29)
const nextWeek: ShoppingPeriod = {
  kind: 'custom',
  weekStart: '2026-11-09',
  from: '2026-11-09',
  to: '2026-11-15',
}

describe('shopping ahead for next week', () => {
  it('opens on the upcoming Monday to Sunday without choosing custom dates', () => {
    expect(defaultShoppingPeriod(sunday)).toMatchObject({
      from: '2026-11-09',
      to: '2026-11-15',
    })
    expect(resolveShoppingPeriod(null, sunday).period).toMatchObject({
      from: '2026-11-09',
      to: '2026-11-15',
    })
  })

  it('keeps a saved future custom week instead of replacing it on reload', () => {
    expect(validShoppingPeriod(nextWeek)).toBe(true)
    expect(resolveShoppingPeriod(nextWeek, sunday)).toMatchObject({
      period: nextWeek,
      choice: 'custom',
      notice: null,
    })
  })

  it.each([
    [new Date(2026, 10, 2, 0), '2026-11-09', '2026-11-15'],
    [new Date(2026, 10, 8, 23, 59), '2026-11-09', '2026-11-15'],
    [new Date(2026, 10, 9, 0), '2026-11-16', '2026-11-22'],
    [new Date(2026, 11, 31, 23), '2027-01-04', '2027-01-10'],
    [new Date(2028, 1, 27, 23), '2028-02-28', '2028-03-05'],
    [new Date(2026, 9, 4, 23), '2026-10-05', '2026-10-11'],
  ])('uses local calendar weeks across boundaries (%s)', (today, from, to) => {
    expect(defaultShoppingPeriod(today)).toEqual({ kind: 'nextWeek', weekStart: from, from, to })
    expect(validShoppingPeriod(defaultShoppingPeriod(today))).toBe(true)
  })

  it('keeps custom dates through their final day, then returns to the household default', () => {
    expect(resolveShoppingPeriod(nextWeek, new Date(2026, 10, 15, 23, 59)).period).toEqual(nextWeek)
    expect(resolveShoppingPeriod(nextWeek, new Date(2026, 10, 16))).toMatchObject({
      choice: 'default',
      period: { kind: 'nextWeek', from: '2026-11-23', to: '2026-11-29' },
      notice: expect.any(String),
    })
  })

  it('keeps this-week overrides even when the household default is next week', () => {
    const current = chooseShoppingPeriod('week', sunday)
    expect(resolveShoppingPeriod(current, sunday)).toMatchObject({
      period: current,
      choice: 'week',
      notice: null,
    })
    expect(
      resolveShoppingPeriod(chooseShoppingPeriod('nextWeek', sunday), new Date(2026, 10, 9)),
    ).toMatchObject({
      choice: 'default',
      period: { kind: 'nextWeek', from: '2026-11-16' },
    })
  })

  it('still rejects malformed, reversed and cross-week custom ranges', () => {
    for (const invalid of [
      { ...nextWeek, from: '' },
      { ...nextWeek, from: '2026-02-30' },
      { ...nextWeek, from: '2026-11-15', to: '2026-11-09' },
      { ...nextWeek, to: '2026-11-16' },
      { ...nextWeek, weekStart: '2026-11-10' },
    ])
      expect(validShoppingPeriod(invalid)).toBe(false)
  })
})
