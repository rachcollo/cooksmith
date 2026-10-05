import { renderApp } from '../../renderApp'
import type { ShoppingItem } from '../../../src/domain/shopping/types'
import type { ShoppingRepository } from '../../../src/application/shopping/shoppingRepository'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
const householdId = '20000000-0000-4000-8000-000000000001'
let rows: ShoppingItem[] = [
  ['sea salt flakes', 50, 'g'],
  ['sea salt flakes plus extra to taste', null, null],
  ['extra virgin olive oil', 60, 'ml'],
  ['extra virgin olive oil', 2, 'tsp'],
  ['extra virgin olive oil', 3, 'tbsp'],
  ['fine sea salt', 10, 'g'],
  ['plain flour', 1, 'cup'],
  ['plain flour', 50, 'g'],
  ['caster sugar', 1, 'cup'],
].map(([name, quantity, unit], index) => ({
  id: String(index),
  householdId,
  name: String(name),
  quantity: quantity as number | null,
  unit: unit as string | null,
  category: 'pantry',
  completed: false,
  manual: name === 'caster sugar',
  measurementSystem: unit === 'tbsp' || name === 'caster sugar' ? 'unknown' : 'au',
  position: index,
  updatedAt: '2026-10-04T00:00:00Z',
}))
rows.push({
  id: 'legacy-sugar',
  householdId,
  name: 'brown sugar see note 3',
  quantity: 55,
  unit: 'g',
  category: 'pantry',
  completed: true,
  manual: false,
  position: 99,
  updatedAt: '2026-10-04T00:00:00Z',
  sourceQuantities: [{ name: 'brown sugar see note 3', quantity: '55', unit: 'g' }],
})
const unused = async (): Promise<never> => {
  throw new Error('Unexpected fixture action')
}
const shopping: ShoppingRepository = {
  list: async () => rows,
  refreshStructure: async () => {
    rows = rows.map((row) => (row.id === 'legacy-sugar' ? { ...row, name: 'brown sugar' } : row))
    return { refreshed: 1, skipped: 0 }
  },
  create: unused,
  update: async (id, input) => {
    const updated = { ...rows.find((row) => row.id === id)!, ...input }
    rows = rows.map((row) => (row.id === id ? updated : row))
    return updated
  },
  setCompleted: unused,
  remove: unused,
  setCompletedMany: async (_householdId, ids, completed) => {
    rows = rows.map((row) => (ids.includes(row.id) ? { ...row, completed } : row))
  },
  removeMany: async (_householdId, ids) => {
    rows = rows.filter((row) => !ids.includes(row.id))
  },
  updatePurchase: async (_householdId, inputs) => {
    rows = rows.map((row) => {
      const input = inputs.find((input) => input.id === row.id)
      return input ? { ...row, ...input, manual: true, combineWithPlan: true } : row
    })
  },
}
renderApp(
  '/shopping',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  shopping,
)
