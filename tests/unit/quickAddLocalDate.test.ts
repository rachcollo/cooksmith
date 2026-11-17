import { describe, expect, it } from 'vitest'
import { toLocalIsoDate } from '../../src/domain/meal-plans/week'

describe('quick-add profile-local date', () => {
  it.each([
    ['2026-11-18T14:30:00Z', 'Australia/Melbourne', '2026-11-19'],
    ['2026-11-19T02:30:00Z', 'America/Los_Angeles', '2026-11-18'],
    ['2026-12-31T23:30:00Z', 'Australia/Melbourne', '2027-01-01'],
    ['2026-04-04T15:30:00Z', 'Australia/Melbourne', '2026-04-05'],
    ['2026-04-04T16:30:00Z', 'Australia/Melbourne', '2026-04-05'],
  ])('formats %s in %s as %s', (instant, zone, expected) => {
    expect(toLocalIsoDate(new Date(instant), zone)).toBe(expected)
  })

  it('retains device-local behaviour when no profile timezone exists', () => {
    expect(toLocalIsoDate(new Date(2026, 10, 19, 0, 30))).toBe('2026-11-19')
  })
})
