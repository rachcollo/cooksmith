import { addDays, currentWeek, startOfWeek, toLocalIsoDate } from '../meal-plans/week'
import type { ShoppingItem, ShoppingSourceQuantity } from './types'

export type ShoppingPeriodKind = 'week' | 'next3' | 'next5' | 'custom' | 'default'
export type ShoppingPreset = 'week' | 'next3' | 'next5'
export const shoppingPresetLabels: Record<ShoppingPreset, string> = {
  week: 'Full active week',
  next3: 'Next 3 planned meals',
  next5: 'Next 5 planned meals',
}
export interface ShoppingPeriod {
  kind: ShoppingPeriodKind
  weekStart: string
  from: string
  to: string
}
export interface PeriodMeal {
  id: string
  mealDate: string
  mealType: string
}
export interface ShoppingContribution {
  stockCheck?: boolean
  plannedMealId: string
  quantity: number | null
  unit: string | null
  sourceQuantities: ShoppingSourceQuantity[]
}
export interface PeriodShoppingItem extends ShoppingItem {
  boughtQuantity?: number | null
  boughtUnit?: string | null
  planOverride?: boolean
  contributions: ShoppingContribution[]
}
export interface ShoppingPeriodView {
  period: ShoppingPeriod
  choice?: ShoppingPeriodKind
  defaultKind?: ShoppingPreset
  items: ShoppingItem[]
  description: string
  notice: string | null
}
export function defaultShoppingPeriod(today = new Date()): ShoppingPeriod {
  const weekStart = currentWeek(today)
  return { kind: 'week', weekStart, from: weekStart, to: addDays(weekStart, 6) }
}
export function chooseShoppingPeriod(kind: ShoppingPeriodKind, today = new Date()): ShoppingPeriod {
  const period = defaultShoppingPeriod(today)
  return {
    ...period,
    kind,
    from: kind === 'next3' || kind === 'next5' ? toLocalIsoDate(today) : period.from,
  }
}
function calendarDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function validShoppingPeriod(period: ShoppingPeriod) {
  return (
    ['week', 'next3', 'next5', 'custom', 'default'].includes(period.kind) &&
    [period.weekStart, period.from, period.to].every(calendarDate) &&
    startOfWeek(period.weekStart) === period.weekStart &&
    period.from >= period.weekStart &&
    period.to <= addDays(period.weekStart, 6) &&
    period.from <= period.to
  )
}
export function resolveShoppingPeriod(
  saved: ShoppingPeriod | null,
  today = new Date(),
  defaultKind: ShoppingPreset = 'week',
) {
  const fallback = chooseShoppingPeriod(defaultKind, today)
  if (!saved || saved.kind === 'default')
    return { period: fallback, choice: 'default' as ShoppingPeriodKind, notice: null }
  if (!validShoppingPeriod(saved) || saved.weekStart !== fallback.weekStart)
    return {
      period: fallback,
      choice: 'default' as ShoppingPeriodKind,
      notice: 'The previous shopping period has ended. Using your household default.',
    }
  return { period: saved, choice: saved.kind, notice: null }
}
export function selectedPeriodMeals(period: ShoppingPeriod, meals: readonly PeriodMeal[]) {
  const order = ['breakfast', 'lunch', 'dinner', 'snack']
  const sorted = meals
    .filter((m) => m.mealDate >= period.from && m.mealDate <= period.to)
    .sort(
      (a, b) =>
        a.mealDate.localeCompare(b.mealDate) ||
        order.indexOf(a.mealType) - order.indexOf(b.mealType) ||
        a.id.localeCompare(b.id),
    )
  return sorted.slice(0, period.kind === 'next3' ? 3 : period.kind === 'next5' ? 5 : undefined)
}
export function shoppingPeriodView(
  rows: PeriodShoppingItem[],
  saved: ShoppingPeriod | null,
  meals: PeriodMeal[],
  today = new Date(),
  defaultKind: ShoppingPreset = 'week',
): ShoppingPeriodView {
  const { period, choice, notice } = resolveShoppingPeriod(saved, today, defaultKind)
  const selected = selectedPeriodMeals(period, meals)
  const included = new Set(selected.map((m) => m.id))
  const items = rows.flatMap((row) => {
    if (row.manual !== false && (!row.planOverride || row.contributions.length === 0)) return [row]
    const contributions = row.contributions.filter((c) => included.has(c.plannedMealId))
    if (!contributions.length) return []
    if (row.completed && row.boughtQuantity !== undefined)
      return [{ ...row, quantity: row.boughtQuantity, unit: row.boughtUnit ?? null }]
    const stockCheck = contributions.some((c) => c.stockCheck)
    const sources = contributions.flatMap((c) => c.sourceQuantities)
    if (row.planOverride) return [{ ...row, sourceQuantities: sources }]
    if (contributions.every((c) => c.quantity === 0)) return []
    const units = new Set(contributions.map((c) => c.unit ?? ''))
    return [
      {
        ...row,
        stockCheck,
        quantity:
          units.size === 1 && contributions.every((c) => c.quantity !== null)
            ? contributions.reduce((sum, c) => sum + c.quantity!, 0)
            : null,
        unit: units.size === 1 ? contributions[0]!.unit : null,
        sourceQuantities: sources,
      },
    ]
  })
  const shortDate = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
  const range = `${shortDate.format(new Date(period.from))}–${shortDate.format(new Date(period.to))}`
  return {
    period,
    choice,
    defaultKind,
    items,
    notice,
    description: `${range} · ${selected.length} planned ${selected.length === 1 ? 'meal' : 'meals'}`,
  }
}
