import {
  canonicalIngredientName,
  canonicalIngredientUnit,
  parseIngredientQuantity,
} from './ingredientIdentity'
import { parsePurchaseLine, purchaseProductName } from './purchaseIngredients'
import type { ShoppingItem } from './types'

export interface PurchaseAmount {
  quantity: number | null
  unit: string | null
  asNeeded?: boolean
}
export interface ShoppingPurchase extends ShoppingItem {
  members: ShoppingItem[]
  amounts: PurchaseAmount[]
  amountLabel: string
}

// Cooksmith uses metric teaspoons (5 mL). Tablespoons/cups retain their stated units
// because imported recipes do not yet record which regional measure they use.
export function purchaseMeasure(unit: string | null) {
  const canonical = canonicalIngredientUnit(unit?.trim().replace(/\.$/u, '') ?? null)
  return canonical.unit === 'tsp' ? { unit: 'ml', multiplier: 5 } : canonical
}
export function purchasingName(name: string) {
  return canonicalIngredientName(purchaseProductName(name))
}
export function purchaseAmount(
  item: Pick<ShoppingItem, 'name' | 'quantity' | 'unit'>,
): PurchaseAmount {
  const legacy = item.quantity === null && !item.unit ? parsePurchaseLine(item.name) : null
  const measure = purchaseMeasure(legacy?.unit ?? item.unit)
  const quantity = legacy ? parseIngredientQuantity(legacy.quantity) : item.quantity
  return { quantity: quantity === null ? null : quantity * measure.multiplier, unit: measure.unit }
}
export function purchaseName(item: Pick<ShoppingItem, 'name' | 'quantity' | 'unit'>) {
  return purchasingName(
    item.quantity === null && !item.unit ? parsePurchaseLine(item.name).name : item.name,
  )
}
export function formatPurchaseAmounts(amounts: PurchaseAmount[]): string {
  return amounts
    .map(({ quantity, unit, asNeeded }) =>
      asNeeded
        ? 'to taste'
        : quantity === null
          ? 'quantity not specified'
          : `${Math.round(quantity * 100) / 100}${unit ? ` ${unit}` : ''}`,
    )
    .join(' + ')
}
export function groupShoppingPurchases(items: readonly ShoppingItem[]): ShoppingPurchase[] {
  const names = new Set(items.map((item) => `${item.householdId}\u0000${purchaseName(item)}`))
  const groups = new Map<string, ShoppingItem[]>()
  for (const item of items) {
    let key = purchaseName(item)
    const prefix = `${item.householdId}\u0000`
    const useFlakes =
      names.has(`${prefix}sea salt flakes`) &&
      !names.has(`${prefix}fine sea salt`) &&
      !names.has(`${prefix}coarse sea salt`)
    // An unspecified sea salt can use the explicitly requested flakes. Never infer a density.
    if (key === 'sea salt' && useFlakes) key = 'sea salt flakes'
    groups.set(prefix + key, [...(groups.get(prefix + key) ?? []), item])
  }
  return [...groups].map(([key, members]) => {
    const name = key.slice(key.indexOf('\u0000') + 1)
    const only = members[0]!
    if (members.length === 1 && only.manual !== false) {
      const amounts = [{ quantity: only.quantity, unit: only.unit }]
      return { ...only, members, amounts, amountLabel: formatPurchaseAmounts(amounts) }
    }
    const remaining = members.filter((item) => !item.completed)
    const visible = remaining.length ? remaining : members
    const byUnit = new Map<string, PurchaseAmount>()
    for (const item of visible) {
      const sources =
        item.manual === false && item.quantity === null && item.sourceQuantities?.length
          ? item.sourceQuantities.map((source) => ({
              name: source.name,
              quantity:
                typeof source.quantity === 'number'
                  ? source.quantity
                  : parseIngredientQuantity(source.quantity),
              unit: source.unit,
            }))
          : [item]
      for (const source of sources) {
        const amount = purchaseAmount(source)
        const asNeeded = /\b(to taste|as needed|as required)\b/iu.test(source.name)
        if (asNeeded) byUnit.set('as-needed', { quantity: null, unit: null, asNeeded: true })
        if (asNeeded && amount.quantity === null) continue
        const key = `${amount.unit ?? ''}:${amount.quantity === null ? 'unknown' : 'known'}`
        const current = byUnit.get(key)
        if (!current) byUnit.set(key, { ...amount })
        else if (current.quantity !== null && amount.quantity !== null)
          current.quantity += amount.quantity
      }
      if (
        item.sourceQuantities?.some((source) =>
          /\b(to taste|as needed|as required)\b/iu.test(source.name),
        )
      )
        byUnit.set('as-needed', { quantity: null, unit: null, asNeeded: true })
    }
    const amounts = [...byUnit.values()]
      .filter((amount) => !(amount.quantity === 0 && byUnit.has(`${amount.unit ?? ''}:unknown`)))
      .sort((left, right) => Number(left.quantity === null) - Number(right.quantity === null))
    const label = members[0]!.name.trim().toLowerCase() === name ? members[0]!.name : name
    return {
      ...members[0]!,
      name: label,
      members,
      amounts,
      quantity: amounts.length === 1 ? amounts[0]!.quantity : null,
      unit: amounts.length === 1 ? amounts[0]!.unit : null,
      amountLabel: formatPurchaseAmounts(amounts),
      completed: remaining.length === 0,
    }
  })
}
