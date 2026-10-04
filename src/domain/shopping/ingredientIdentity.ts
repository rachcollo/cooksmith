// Versioned purchasing identity. Preparation tasks keep their own recipe/source identity.
export const ingredientIdentityVersion = 1 as const

const singulars: Readonly<Record<string, string>> = {
  onions: 'onion',
  carrots: 'carrot',
  potatoes: 'potato',
  tomatoes: 'tomato',
  capsicums: 'capsicum',
  zucchinis: 'zucchini',
  courgettes: 'courgette',
  chillies: 'chilli',
  chilis: 'chilli',
  peppers: 'pepper',
  powders: 'powder',
  cloves: 'clove',
  eggs: 'egg',
  lemons: 'lemon',
  limes: 'lime',
  apples: 'apple',
}

export function canonicalIngredientName(value: string): string {
  let name = value
    .normalize('NFKC')
    .toLocaleLowerCase('en-AU')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  // Quantity-bearing free text and packaged/pre-prepared products are not guessed away.
  if (/\d/u.test(name)) return name
  name = name
    .split(' ')
    .map((word) => singulars[word] ?? word)
    .join(' ')
    .replace(/\bbell pepper\b/gu, 'capsicum')
    .replace(/\bcourgette\b/gu, 'zucchini')
    .replace(/\bcilantro\b/gu, 'coriander')
    .replace(/\byogurt\b/gu, 'yoghurt')
  if (
    !/\b(frozen|canned|tinned|jar|jarred|pre|ready|packet|packaged|dried|powder|paste)\b/u.test(
      name,
    ) &&
    /\b(onion|carrot|potato|capsicum|zucchini|celery|garlic|ginger|chilli)\b/u.test(name)
  ) {
    name = name
      .replace(/\b(finely|roughly|thinly|thickly|diced|sliced|chopped|grated)\b/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
  }
  return name
}

export function canonicalIngredientUnit(unit: string | null): {
  unit: string | null
  multiplier: number
} {
  const value = unit?.trim().toLocaleLowerCase('en-AU') ?? ''
  if (['', 'each', 'whole', 'count'].includes(value)) return { unit: null, multiplier: 1 }
  if (['g', 'gram', 'grams'].includes(value)) return { unit: 'g', multiplier: 1 }
  if (['kg', 'kilogram', 'kilograms'].includes(value)) return { unit: 'g', multiplier: 1000 }
  if (['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'].includes(value))
    return { unit: 'ml', multiplier: 1 }
  if (['l', 'litre', 'litres', 'liter', 'liters'].includes(value))
    return { unit: 'ml', multiplier: 1000 }
  const aliases: Readonly<Record<string, string>> = {
    teaspoons: 'tsp',
    teaspoon: 'tsp',
    tablespoons: 'tbsp',
    tablespoon: 'tbsp',
    cups: 'cup',
    cloves: 'clove',
    cans: 'can',
    tins: 'tin',
  }
  return { unit: aliases[value] ?? value, multiplier: 1 }
}

export function parseIngredientQuantity(value: string | null): number | null {
  if (value === null || !value.trim()) return null
  const fraction = value.trim().match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/u)
  const quantity = fraction
    ? Number(fraction[1] ?? 0) + Number(fraction[2]) / Number(fraction[3])
    : Number(value)
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null
}

export function ingredientPurchaseKey(name: string, unit: string | null): string {
  return JSON.stringify([
    ingredientIdentityVersion,
    canonicalIngredientName(name),
    canonicalIngredientUnit(unit).unit,
  ])
}
