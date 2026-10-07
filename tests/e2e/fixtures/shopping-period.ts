import { renderApp, defaultShoppingRepository } from '../../renderApp'
import {
  defaultShoppingPeriod,
  shoppingPeriodView,
  type ShoppingPeriod,
  type ShoppingPreset,
  type PeriodShoppingItem,
} from '../../../src/domain/shopping/period'
import { addDays } from '../../../src/domain/meal-plans/week'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
let saved: ShoppingPeriod | null = null
let defaultKind: ShoppingPreset = 'week'
const week = defaultShoppingPeriod().weekStart
const meals = [0, 1, 2, 3, 4].map((day) => ({
  id: `meal-${day}`,
  mealDate: addDays(week, day),
  mealType: 'dinner',
}))
const rows: PeriodShoppingItem[] = [
  {
    id: 'rice',
    householdId: '20000000-0000-4000-8000-000000000001',
    name: 'Rice',
    quantity: 5,
    unit: 'kg',
    category: 'pantry',
    manual: false,
    completed: false,
    position: 0,
    updatedAt: week,
    contributions: meals.map((m) => ({
      plannedMealId: m.id,
      quantity: 1,
      unit: 'kg',
      sourceQuantities: [{ name: 'rice', quantity: 1, unit: 'kg' }],
    })),
  },
  {
    id: 'soap',
    householdId: '20000000-0000-4000-8000-000000000001',
    name: 'Soap',
    quantity: 1,
    unit: null,
    category: 'household',
    manual: true,
    completed: false,
    position: 1,
    updatedAt: week,
    contributions: [],
  },
]
let fail = new URLSearchParams(location.search).has('fail')
const load = async () => shoppingPeriodView(rows, saved, meals, new Date(), defaultKind)
const repository = {
  ...defaultShoppingRepository,
  loadDefault: async () => defaultKind,
  saveDefault: async (_h: string, preset: ShoppingPreset) => {
    defaultKind = preset
  },
  loadPeriod: load,
  list: async () => (await load()).items,
  savePeriod: async (_h: string, period: ShoppingPeriod) => {
    if (fail) {
      fail = false
      throw new Error('offline')
    }
    saved = period
  },
}
renderApp(
  new URLSearchParams(location.search).has('settings') ? '/settings' : '/shopping',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  repository,
)
