import { defaultShoppingRepository } from '../renderApp'
import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
import type { PutAwaySource, PutAwayResult } from '../../src/domain/shopping/putAway'
export function putAwayFixture() {
  const initial: PutAwaySource[] = [
    { key: 'c:milk-1', token: 'milk-first', shoppingItemId: 'milk', name: 'Milk' },
    { key: 'c:milk-2', token: 'milk-second', shoppingItemId: 'milk', name: 'milk' },
    { key: 'm:apples', token: 'apples-first', shoppingItemId: 'apples', name: 'Apples' },
  ]
  const applied = new Set<string>()
  const receipts = new Map<string, PutAwayResult>()
  const stock = new Set<string>()
  const repository: ShoppingRepository = {
    ...defaultShoppingRepository,
    listPutAway: async () => initial.filter((s) => !applied.has(s.key)),
    putAway: async (_household, id, choices) => {
      const previous = receipts.get(id)
      if (previous) return previous
      let count = 0
      const names = new Set<string>()
      for (const choice of choices)
        for (const source of choice.sources) {
          if (!applied.has(source.key)) {
            applied.add(source.key)
            stock.add(choice.name)
            names.add(choice.name)
            count++
          }
        }
      const result = { appliedSources: count, alreadyAppliedSources: 0, pantryItems: names.size }
      receipts.set(id, result)
      return result
    },
  }
  return { repository, stock, applied }
}
