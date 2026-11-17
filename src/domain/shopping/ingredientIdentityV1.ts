/** Frozen identity for validating existing recipe structure/enrichment contracts.
 * Purchasing uses ingredientIdentity.ts; do not change this compatibility definition. */
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
