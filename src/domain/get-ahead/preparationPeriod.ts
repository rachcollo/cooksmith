import { addDays, currentWeek } from '../meal-plans/week'

export type PreparationPeriodPreset = 'next-weekdays' | 'this-week' | 'next-week' | 'custom'

export interface PreparationPeriod {
  start: string
  end: string
}

export function periodForPreset(
  preset: Exclude<PreparationPeriodPreset, 'custom'>,
  today = new Date(),
): PreparationPeriod {
  const thisMonday = currentWeek(today)
  if (preset === 'this-week') return { start: thisMonday, end: addDays(thisMonday, 6) }
  const nextMonday = addDays(thisMonday, 7)
  return {
    start: nextMonday,
    end: addDays(nextMonday, preset === 'next-weekdays' ? 4 : 6),
  }
}

export function validatePreparationPeriod(period: PreparationPeriod): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.start) || !/^\d{4}-\d{2}-\d{2}$/.test(period.end))
    return 'Choose both a start and end date.'
  if (period.start > period.end) return 'The end date must be on or after the start date.'
  return null
}
