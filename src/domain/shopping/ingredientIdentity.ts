// Versioned purchasing identity. Preparation tasks keep their own recipe/source identity.
export const ingredientIdentityVersion = 2 as const

// Inflection exceptions protect mass nouns, singular -s endings and irregular plurals.
const singularExceptions: Readonly<Record<string, string>> = {
  asparagus: 'asparagus',
  couscous: 'couscous',
  hummus: 'hummus',
  molasses: 'molasses',
  watercress: 'watercress',
  cress: 'cress',
  bass: 'bass',
  citrus: 'citrus',
  grass: 'grass',
  lemongrass: 'lemongrass',
  oats: 'oats',
  news: 'news',
  swiss: 'swiss',
  potatoes: 'potato',
  tomatoes: 'tomato',
  chillies: 'chilli',
  chilis: 'chilli',
  leaves: 'leaf',
  loaves: 'loaf',
  halves: 'half',
  knives: 'knife',
  anchovies: 'anchovy',
  cookies: 'cookie',
  brownies: 'brownie',
}

function singularIngredientWord(word: string): string {
  if (singularExceptions[word]) return singularExceptions[word]
  if (/(?:ss|us|is)$/u.test(word)) return word
  if (/[^aeiou]ies$/u.test(word)) return word.slice(0, -3) + 'y'
  if (/(?:ches|shes|xes|zzes|sses)$/u.test(word)) return word.slice(0, -2)
  if (word.length > 3 && /s$/u.test(word)) return word.slice(0, -1)
  return word
}

// Only interchangeable purchasing terms. Shallot, pumpkin/squash and generic
// pepper are deliberately excluded because imported recipes use them ambiguously.
const synonyms: readonly [RegExp, string][] = [
  [/\bbell pepper\b/gu, 'capsicum'],
  [/\bcourgette\b/gu, 'zucchini'],
  [/\baubergine\b/gu, 'eggplant'],
  [/\bcilantro\b/gu, 'coriander'],
  [/\byogurt\b/gu, 'yoghurt'],
  [/\bscallion\b/gu, 'spring onion'],
  [/\bgreen onion\b/gu, 'spring onion'],
  [/\barugula\b/gu, 'rocket'],
  [/\bmangetout\b/gu, 'snow pea'],
  [/\bgarbanzo bean\b/gu, 'chickpea'],
  [/\bshrimp\b/gu, 'prawn'],
  [/\bconfectioner sugar\b/gu, 'icing sugar'],
  [/\bpowdered sugar\b/gu, 'icing sugar'],
  [/\ball purpose flour\b/gu, 'plain flour'],
  [/\bself rising flour\b/gu, 'self raising flour'],
  [/\bevoo\b/gu, 'extra virgin olive oil'],
]

export function canonicalIngredientName(value: string): string {
  let name = value
    .normalize('NFKC')
    .toLocaleLowerCase('en-AU')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  // Quantity-bearing free text and packaged/pre-prepared products are not guessed away.
  if (/\d/u.test(name)) return name
  name = name.split(' ').map(singularIngredientWord).join(' ')
  for (const [pattern, replacement] of synonyms) name = name.replace(pattern, replacement)
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
  const glyphs: Readonly<Record<string, string>> = {
    '¼': '1/4',
    '½': '1/2',
    '¾': '3/4',
    '⅓': '1/3',
    '⅔': '2/3',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8',
  }
  const normalised = value
    .trim()
    .replace(/([¼½¾⅓⅔⅛⅜⅝⅞])/gu, (glyph) => ` ${glyphs[glyph]}`)
    .trim()
  const fraction = normalised.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/u)
  const quantity = fraction
    ? Number(fraction[1] ?? 0) + Number(fraction[2]) / Number(fraction[3])
    : Number(normalised)
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null
}

export function ingredientPurchaseKey(name: string, unit: string | null): string {
  return JSON.stringify([
    ingredientIdentityVersion,
    canonicalIngredientName(name),
    canonicalIngredientUnit(unit).unit,
  ])
}
