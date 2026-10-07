import {
  convertPurchaseAmount,
  normaliseMeasure,
  type MeasurementSystem,
} from '../measurements/purchaseMeasures'
import { canonicalIngredientName, parseIngredientQuantity } from './ingredientIdentity'
import { parsePurchaseLine, purchaseDisplayName } from './purchaseIngredients'
import type { ShoppingItem } from './types'

export interface PurchaseAmount {
  quantity: number | null
  unit: string | null
  asNeeded?: boolean
  approximate?: boolean
}
export interface ShoppingPurchase extends ShoppingItem {
  members: ShoppingItem[]
  amounts: PurchaseAmount[]
  amountLabel: string
}

export function purchaseMeasure(unit: string | null, system: MeasurementSystem = 'unknown') {
  return normaliseMeasure(unit, system)
}
export function purchasingName(name: string) {
  return canonicalIngredientName(purchaseDisplayName(name))
}
export function purchaseAmount(
  item: Pick<ShoppingItem, 'name' | 'quantity' | 'unit' | 'measurementSystem'>,
): PurchaseAmount {
  const parsed = !item.unit ? parsePurchaseLine(item.name) : null
  const legacy =
    item.quantity === null || (parsed?.unit && parsed.quantity === null) ? parsed : null
  const quantity = legacy?.quantity ? parseIngredientQuantity(legacy.quantity) : item.quantity
  return convertPurchaseAmount(
    purchasingName(legacy?.name ?? item.name),
    quantity,
    legacy?.unit ?? item.unit,
    item.measurementSystem,
  )
}
export function purchaseName(item: Pick<ShoppingItem, 'name' | 'quantity' | 'unit'>) {
  return purchasingName(
    item.quantity === null && !item.unit ? parsePurchaseLine(item.name).name : item.name,
  )
}
export function purchaseDisplayQuantity(quantity: number, approximate = false): number {
  const scale = approximate ? (quantity < 10 ? 10 : 1) : 100
  return approximate
    ? Math.ceil(quantity * scale - 1e-9) / scale
    : Math.round(quantity * scale) / scale
}
export function formatPurchaseAmounts(amounts: PurchaseAmount[]): string {
  return amounts
    .map(({ quantity, unit, asNeeded, approximate }) =>
      asNeeded
        ? 'to taste'
        : quantity === null
          ? 'amount to check'
          : `${approximate ? 'about ' : ''}${purchaseDisplayQuantity(quantity, approximate)}${unit ? ` ${unit}` : ''}`,
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
    const groupKey =
      prefix +
      key +
      (item.manual !== false && !item.combineWithPlan ? `\u0000manual:${item.id}` : '')
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), item])
  }
  return [...groups].map(([key, members]) => {
    const name = key.slice(key.indexOf('\u0000') + 1).split('\u0000')[0]!
    const only = members[0]!
    if (members.length === 1 && only.manual !== false && !purchaseAmount(only).approximate) {
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
              measurementSystem: source.measurementSystem,
            }))
          : [item]
      for (const source of sources) {
        const amount = purchaseAmount(source)
        if (item.manual === false && item.sourceQuantities?.some((source) => source.approximate))
          amount.approximate = true
        const asNeeded = /\b(to taste|as needed|as required)\b/iu.test(source.name)
        if (asNeeded) byUnit.set('as-needed', { quantity: null, unit: null, asNeeded: true })
        if (asNeeded && amount.quantity === null) continue
        const key = `${amount.unit ?? ''}:${amount.quantity === null ? 'unknown' : 'known'}`
        const current = byUnit.get(key)
        if (!current) byUnit.set(key, { ...amount })
        else if (current.quantity !== null && amount.quantity !== null) {
          current.quantity += amount.quantity
          current.approximate ||= amount.approximate
        }
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
      amountLabel: `${visible.some((item) => item.stockCheck) ? 'up to ' : ''}${formatPurchaseAmounts(amounts)}${visible.some((item) => item.stockCheck) ? ' · check Pantry' : ''}`,
      completed: remaining.length === 0,
    }
  })
}
