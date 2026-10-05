import type { Recipe } from '../recipes/types'

const quantityToken = String.raw`(?:\d+\s+\d+\/\d+|\d+\s+[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|(?:\d+(?:\.\d+)?|\.\d+)(?:[¼½¾⅓⅔⅛⅜⅝⅞])?|[¼½¾⅓⅔⅛⅜⅝⅞])`
const linePattern = new RegExp(
  String.raw`^(${quantityToken})(?:\s*(?:-|–|—|to)\s*(${quantityToken}))?\s+(.+)$`,
  'u',
)
const units = new Set([
  'tsp',
  'teaspoon',
  'teaspoons',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'cup',
  'cups',
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'ml',
  'millilitre',
  'millilitres',
  'l',
  'litre',
  'litres',
  'pinch',
  'clove',
  'cloves',
  'slice',
  'slices',
  'can',
  'cans',
  'tin',
  'tins',
  'each',
  'whole',
  'count',
])

export interface PurchaseIngredient {
  conversionName?: string
  name: string
  quantity: string | null
  unit: string | null
}

// Interpret an explicit leading amount, never a package size embedded in a product name.
export function parsePurchaseLine(line: string): PurchaseIngredient {
  const match = line.trim().match(linePattern)
  if (!match) return { name: line.trim(), quantity: null, unit: null }
  const [, start, end, remainder = ''] = match
  const [token = '', ...rest] = remainder.split(/\s+/u)
  if (token.toLowerCase() === 'x') return { name: line.trim(), quantity: null, unit: null }
  const unitToken = token.replace(/\.$/u, '')
  const hasUnit = units.has(unitToken.toLowerCase())
  const name = hasUnit ? rest.join(' ') : remainder
  if (!name) return { name: line.trim(), quantity: null, unit: null }
  return {
    name,
    quantity: end ? `${start}-${end}` : (start ?? null),
    unit: hasUnit ? unitToken : null,
  }
}

// Display-only cleanup: storage identity and source provenance must remain stable for overrides.
export function purchaseDisplayName(name: string): string {
  name = name
    // Keep the requested product, not its optional replacement. Original text stays on the source.
    .replace(/(?:\s*[,;(]\s*|\s+)can be (?:substituted|replaced) (?:with|by)\s+.+$/iu, '')
    .replace(/(?:\s*[,;(]\s*|\s+)see notes?(?:\s+\d+(?:\s*(?:,|and|&)\s*\d+)*)?[.)\]]*$/iu, '')
    .trim()
  return purchaseProductName(name)
    .replace(/^tomato(?:es)?[, ]+finely diced$/iu, 'tomato')
    .replace(/^avocados?[, ]+mashed with a fork$/iu, 'avocado')
}

// Preparation is not part of the product to purchase. Keep packaged forms and mixtures intact.
export function purchaseProductName(name: string): string {
  name = name
    .replace(
      /(?:[,;(]?[ ]*(?:plus[ ]+)?(?:extra[ ]+)?(?:to taste|as needed|as required))[ )\]]*$/iu,
      '',
    )
    .trim()
  if (
    /\b(frozen|canned|tinned|jar|jarred|pre[- ]|ready|packet|packaged|dried|powder|paste)\b/iu.test(
      name,
    ) ||
    !/\b(onions?|carrots?|potatoes?|capsicums?|zucchinis?|courgettes?|celery|garlic|ginger|chillies|chilli)\b/iu.test(
      name,
    )
  )
    return name
  return name
    .replace(
      /\b(peeled|trimmed|finely|roughly|thinly|thickly|diced|sliced|chopped|grated)\b/giu,
      ' ',
    )
    .replace(/[,();]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/^(?:and\s+)+|(?:\s+and)+$/giu, '')
    .trim()
}

export function purchaseIngredientsFor(recipe: Recipe): PurchaseIngredient[] {
  if (!recipe.ingredientRows.length)
    return (recipe.ingredients ?? '')
      .split(/\r?\n|\r/u)
      .map(parsePurchaseLine)
      .filter((row) => row.name)
  return recipe.ingredientRows.map((row) => {
    // Old derived rows can contain the entire line, or the tail of a mixed fraction, as a name.
    if (
      row.originalLineText &&
      (row.parserVersion === 'recipe-content-v1' || row.derivationStatus === 'display_only')
    )
      return parsePurchaseLine(row.originalLineText)
    if (row.quantity === null && !row.unit) return parsePurchaseLine(row.name)
    return {
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      conversionName: [
        row.originalLineText ? parsePurchaseLine(row.originalLineText).name : row.name,
        row.preparation,
      ]
        .filter(Boolean)
        .join(' '),
    }
  })
}
