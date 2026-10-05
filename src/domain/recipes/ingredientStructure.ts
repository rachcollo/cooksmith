import { canonicalIngredientName, parseIngredientQuantity } from '../shopping/ingredientIdentity.ts'

export const ingredientStructureSchemaVersion = 'ingredient-structure-v1' as const
export const ingredientStructureRulesVersion = 'ingredient-structure-rules-v1' as const
export const ingredientStructureParserVersion = 'recipe-content-v2' as const

export interface IngredientStructure {
  schemaVersion: typeof ingredientStructureSchemaVersion
  rulesVersion: typeof ingredientStructureRulesVersion
  originalText: string
  name: string
  sourceName: string
  canonicalName: string
  quantity: {
    text: string | null
    value: number | null
    maximum: number | null
    state: 'known' | 'range' | 'approximate' | 'unknown'
    unit: string | null
    package?: { count: number; size: number; unit: string; originalText: string }
  }
  preparation: string | null
  purpose: string | null
  substitutions: string[]
  noteReferences: string[]
  provenance: 'deterministic'
  unresolved: string[]
}

const quantityToken = String.raw`(?:\d+\s+\d+\/\d+|\d+\s+[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|(?:\d+(?:\.\d+)?|\.\d+)(?:[¼½¾⅓⅔⅛⅜⅝⅞])?|[¼½¾⅓⅔⅛⅜⅝⅞])`
const leadingQuantity = new RegExp(
  String.raw`^(${quantityToken})(?:\s*(?:-|–|—|to)\s*(${quantityToken}))?\s+(.+)$`,
  'u',
)
const unitAliases: Readonly<Record<string, string>> = {
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  pinch: 'pinch',
  pinches: 'pinch',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  can: 'can',
  cans: 'can',
  tin: 'tin',
  tins: 'tin',
  handful: 'handful',
  handfuls: 'handful',
  bunch: 'bunch',
  bunches: 'bunch',
  each: 'each',
  whole: 'whole',
  count: 'count',
}
const preparationWords = String.raw`(?:(?:finely|roughly|thinly|thickly)\s+)?(?:diced|chopped|sliced|minced|grated|shredded|peeled|trimmed|crushed|mashed|smashed|julienned|torn|halved|quartered|cubed|pounded|zested|juiced|washed|deseeded|cut into [^,;()]+)(?:\s+with\s+a\s+fork)?`
const prefixPreparation = new RegExp(String.raw`^(${preparationWords})\s+(.+)$`, 'iu')
const suffixPreparation = new RegExp(
  String.raw`^(.+?)(?:\s*[,;(]\s*|\s+)(${preparationWords}(?:\s*(?:,|and)\s*${preparationWords})*)[)\]]*$`,
  'iu',
)

const metricPackage =
  /^(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|grams?|kg|kilograms?|ml|millilitres?|milliliters?|l|litres?|liters?)\b\s+(.+)$/iu
const packageExpression = /^(?:\d[^a-z]*[x×]|\d+\s*\()/iu

/** Lossless derived semantics. Never infer an oil grade, substitute, package amount or density. */
export function structureIngredient(originalText: string): IngredientStructure {
  let name = originalText.trim()
  let quantityText: string | null = null
  let value: number | null = null
  let maximum: number | null = null
  let unit: string | null = null
  let state: IngredientStructure['quantity']['state'] = 'unknown'
  const unresolved: string[] = []
  const approximation = name.match(/^(?:about|approximately|approx\.?|~)\s*/iu)?.[0] ?? ''
  const packageMatch = name.match(metricPackage)
  let packageAmount: IngredientStructure['quantity']['package']
  const isPackage = packageExpression.test(name.slice(approximation.length))
  const leading = name.slice(approximation.length).match(leadingQuantity)
  if (
    packageMatch &&
    !approximation &&
    Number.isSafeInteger(Number(packageMatch[1])) &&
    Number(packageMatch[1]) > 0 &&
    Number(packageMatch[2]) > 0 &&
    Number.isFinite(Number(packageMatch[1]) * Number(packageMatch[2])) &&
    !/\b(?:drained|net|gross|each|approximately|about)\b|[\d]\s*(?:g|kg|ml|l)\b/iu.test(
      packageMatch[4]!,
    )
  ) {
    quantityText = name.slice(0, name.length - packageMatch[4]!.length).trim()
    unit = unitAliases[packageMatch[3]!.toLowerCase()]!
    packageAmount = {
      count: Number(packageMatch[1]),
      size: Number(packageMatch[2]),
      unit: packageMatch[3]!,
      originalText: quantityText,
    }
    value = Number((packageAmount.count * packageAmount.size).toPrecision(15))
    maximum = value
    state = 'known'
    name = packageMatch[4]!
  } else if (isPackage) {
    unresolved.push('package_quantity')
  } else if (leading && !/^x\b/iu.test(leading[3] ?? '')) {
    quantityText = approximation + (leading[2] ? `${leading[1]}-${leading[2]}` : leading[1]!)
    value = parseIngredientQuantity(leading[1]!)
    maximum = leading[2] ? parseIngredientQuantity(leading[2]) : value
    state =
      value === null || maximum === null
        ? 'unknown'
        : leading[2]
          ? 'range'
          : approximation
            ? 'approximate'
            : 'known'
    name = leading[3]!
    const [token = '', ...remainder] = name.split(/\s+/u)
    const recognised = unitAliases[token.toLowerCase().replace(/\.$/u, '')]
    if (recognised && remainder.length) {
      unit = recognised
      name = remainder.join(' ')
    }
  } else if (leading) unresolved.push('package_quantity')

  const sourceName = name
  const noteReferences: string[] = []
  name = name.replace(
    /(?:\s*[,;(]\s*|\s+)(see notes?(?:\s+\d+(?:\s*(?:,|and|&)\s*\d+)*)?)[.)\]]*$/iu,
    (_match, reference: string) => {
      noteReferences.push(reference)
      return ''
    },
  )
  const substitutions: string[] = []
  name = name.replace(
    /(?:\s*[,;(]\s*|\s+)(can be (?:substituted|replaced) (?:with|by)\s+.+?)[)\]]*$/iu,
    (_match, alternative: string) => {
      substitutions.push(alternative)
      return ''
    },
  )
  // A note may precede a substitution. Re-run only this explicit suffix grammar.
  name = name.replace(
    /(?:\s*[,;(]\s*|\s+)(see notes?(?:\s+\d+(?:\s*(?:,|and|&)\s*\d+)*)?)[.)\]]*$/iu,
    (_match, reference: string) => {
      noteReferences.push(reference)
      return ''
    },
  )
  let purpose: string | null = null
  name = name.replace(
    /(?:\s*[,;(]\s*|\s+)(for (?:frying|serving|garnishing|greasing|dusting)|(?:plus\s+)?(?:extra\s+)?to taste|as needed|as required)[)\]]*$/iu,
    (_match, usage: string) => {
      purpose = usage
      return ''
    },
  )

  const preparations: string[] = []
  const prefix = name.match(prefixPreparation)
  // Preparation grammar applies to arbitrary ingredient names. Explicit purchased forms and
  // common ambiguous processed products stay intact rather than requiring a food whitelist.
  const purchasedForm =
    /\b(canned|tinned|frozen|dried|jar|jarred|commercially|pre[- ]|ready[- ]|packet|packaged|powder|paste)\b/iu.test(
      name,
    )
  const ambiguousProcessedForm =
    /^(?:diced|crushed)\s+tomato(?:es)?\b|^minced\s+(?:beef|pork|chicken|turkey|lamb|meat)\b|^sliced\s+(?:bread|ham|cheese)\b/iu.test(
      name,
    )
  const explicitPreparation = prefix && /^(?:finely|roughly|thinly|thickly)\s/iu.test(prefix[1]!)
  if (prefix && ((!purchasedForm && !ambiguousProcessedForm) || explicitPreparation)) {
    preparations.push(prefix[1]!)
    name = prefix[2]!
  } else if (prefix) unresolved.push('purchased_form_or_preparation')
  const suffix = name.match(suffixPreparation)
  if (suffix) {
    preparations.push(suffix[2]!)
    name = suffix[1]!
  }
  name = name
    .trim()
    .replace(/[,;]\s*$/u, '')
    .trim()
  if (!name) {
    name = originalText.trim()
    unresolved.push('product_name')
  }
  if (/\b(?:or|and\/or)\b/iu.test(name)) unresolved.push('alternative_product')
  if (noteReferences.length) unresolved.push('note_body')
  return {
    schemaVersion: ingredientStructureSchemaVersion,
    rulesVersion: ingredientStructureRulesVersion,
    originalText,
    name,
    sourceName,
    canonicalName: canonicalIngredientName(name),
    quantity: {
      text: quantityText,
      value,
      maximum,
      state,
      unit,
      ...(packageAmount ? { package: packageAmount } : {}),
    },
    preparation: preparations.join(', ') || null,
    purpose,
    substitutions,
    noteReferences,
    provenance: 'deterministic',
    unresolved,
  }
}

/** Re-derive known legacy rows without changing source IDs or overwriting explicit structured edits. */
export function structureExistingIngredient(input: {
  name: string
  quantity: string | null
  unit: string | null
  preparation: string | null
  originalLineText: string
  parserVersion?: string | null
}): IngredientStructure {
  const originalLineText =
    input.originalLineText ?? [input.quantity, input.unit, input.name].filter(Boolean).join(' ')
  const generated =
    input.parserVersion === 'recipe-content-v1' ||
    input.parserVersion === ingredientStructureParserVersion
  const structure = structureIngredient(generated ? originalLineText : input.name)
  if (
    !generated ||
    (structure.quantity.text === null && !structure.unresolved.includes('package_quantity'))
  ) {
    const value = parseIngredientQuantity(input.quantity)
    structure.quantity = {
      text: input.quantity,
      value,
      maximum: value,
      state: value === null ? 'unknown' : 'known',
      unit: input.unit,
    }
  }
  structure.originalText = originalLineText
  if (!generated && input.preparation) structure.preparation = input.preparation
  return structure
}
