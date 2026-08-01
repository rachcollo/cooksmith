import { describe, expect, it } from 'vitest'

import {
  periodForPreset,
  validatePreparationPeriod,
} from '../../src/domain/get-ahead/preparationPeriod'

describe('Get Ahead preparation period', () => {
  const saturday = new Date('2026-08-01T09:00:00+10:00')

  it('defaults to the following Monday through Friday', () => {
    expect(periodForPreset('next-weekdays', saturday)).toEqual({
      start: '2026-08-03',
      end: '2026-08-07',
    })
  })

  it('offers complete current and next weeks', () => {
    expect(periodForPreset('this-week', saturday)).toEqual({
      start: '2026-07-27',
      end: '2026-08-02',
    })
    expect(periodForPreset('next-week', saturday)).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
    })
  })

  it('validates flexible date ranges', () => {
    expect(validatePreparationPeriod({ start: '2026-08-04', end: '2026-08-06' })).toBeNull()
    expect(validatePreparationPeriod({ start: '2026-08-06', end: '2026-08-04' })).toContain(
      'end date',
    )
  })
})
