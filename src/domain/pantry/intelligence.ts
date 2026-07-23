import type { PlannedMeal } from '../meal-plans/types'
import type { ShoppingItem, ShoppingItemInput } from '../shopping/types'
import type { PantryItem } from './types'

export type PantryInsightKind = 'recently_out' | 'low_stock' | 'upcoming_need'

export interface PantryInsight {
  id: string
  kind: PantryInsightKind
  pantryItemId: string
  itemName: string
  reason: string
  ruleVersion: 'pantry-intelligence-v1'
  shoppingInput: ShoppingItemInput
}

const ruleVersion = 'pantry-intelligence-v1' as const
const lowStockUnits = new Set(['', 'item', 'items', 'each'])

function key(value: string) {
  return value.trim().toLocaleLowerCase()
}

function hasListedItem(shoppingItems: ShoppingItem[], itemName: string) {
  const candidate = key(itemName)
  return shoppingItems.some((item) => !item.completed && key(item.name) === candidate)
}

function shoppingCategory(item: PantryItem): ShoppingItemInput['category'] {
  if (item.category === 'produce') return 'produce'
  if (item.category === 'dairy') return 'dairy_and_eggs'
  if (item.category === 'meat_and_seafood') return 'meat_and_seafood'
  if (item.category === 'bakery') return 'bakery'
  if (item.category === 'frozen') return 'frozen'
  if (item.category === 'household') return 'household'
  return 'pantry'
}

function toShoppingInput(item: PantryItem): ShoppingItemInput {
  return { name: item.name, quantity: null, unit: null, category: shoppingCategory(item) }
}

function isLowStock(item: PantryItem) {
  if (!item.available || item.quantity === null) return false
  const unit = key(item.unit ?? '')
  return lowStockUnits.has(unit) && item.quantity <= 1
}

function mealMentionsItem(meal: PlannedMeal, item: PantryItem) {
  const haystack = `${meal.title} ${meal.notes ?? ''}`.toLocaleLowerCase()
  const needle = key(item.name)
  return (
    needle.length >= 3 &&
    new RegExp(`(^|\\W)${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`, 'i').test(haystack)
  )
}

export function createPantryInsights(input: {
  pantryItems: PantryItem[]
  shoppingItems: ShoppingItem[]
  plannedMeals: PlannedMeal[]
  dismissedInsightIds?: ReadonlySet<string>
}): PantryInsight[] {
  const dismissed = input.dismissedInsightIds ?? new Set<string>()
  const insights: PantryInsight[] = []
  const seen = new Set<string>()

  function add(insight: PantryInsight) {
    if (dismissed.has(insight.id) || seen.has(key(insight.itemName))) return
    if (hasListedItem(input.shoppingItems, insight.itemName)) return
    seen.add(key(insight.itemName))
    insights.push(insight)
  }

  for (const meal of input.plannedMeals) {
    for (const item of input.pantryItems) {
      if (!item.available && mealMentionsItem(meal, item)) {
        add({
          id: `upcoming-need:${meal.id}:${item.id}`,
          kind: 'upcoming_need',
          pantryItemId: item.id,
          itemName: item.name,
          reason: `${item.name} appears in ${meal.title}, but your pantry marks it out of stock.`,
          ruleVersion,
          shoppingInput: toShoppingInput(item),
        })
      }
    }
  }

  for (const item of input.pantryItems) {
    if (!item.available) {
      add({
        id: `recently-out:${item.id}`,
        kind: 'recently_out',
        pantryItemId: item.id,
        itemName: item.name,
        reason: `${item.name} is marked out of stock in your confirmed pantry.`,
        ruleVersion,
        shoppingInput: toShoppingInput(item),
      })
      continue
    }
    if (isLowStock(item)) {
      add({
        id: `low-stock:${item.id}`,
        kind: 'low_stock',
        pantryItemId: item.id,
        itemName: item.name,
        reason: `${item.name} has ${item.quantity} ${item.unit ?? 'item'} left, using the explicit low-stock rule for counted items.`,
        ruleVersion,
        shoppingInput: toShoppingInput(item),
      })
    }
  }

  return insights
}
