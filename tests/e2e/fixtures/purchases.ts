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
].map(([name, quantity, unit], index) => ({
  id: String(index),
  householdId,
  name: String(name),
  quantity: quantity as number | null,
  unit: unit as string | null,
  category: 'pantry',
  completed: false,
  manual: false,
  position: index,
  updatedAt: '2026-10-04T00:00:00Z',
}))
const unused = async (): Promise<never> => {
  throw new Error('Unexpected fixture action')
}
const shopping: ShoppingRepository = {
  list: async () => rows,
  create: unused,
  update: unused,
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
      return input ? { ...row, ...input, manual: true } : row
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
