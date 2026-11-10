import { canonicalIngredientName, parseIngredientQuantity } from '../shopping/ingredientIdentity.ts'

export const ingredientStructureSchemaVersion = 'ingredient-structure-v1' as const
export const ingredientStructureRulesVersion = 'ingredient-structure-rules-v2' as const
export const ingredientStructureParserVersion = 'recipe-content-v2' as const

export interface IngredientStructure {
  schemaVersion: typeof ingredientStructureSchemaVersion
  rulesVersion: typeof ingredientStructureRulesVersion | 'ingredient-structure-rules-v1'
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
    alternateMeasures?: Array<{ text: string; value: number; unit: string }>
    package?: { count: number; size: number; unit: string; originalText: string }
  }
  preparation: string | null
  purpose: string | null
  notes?: string[]
  optional?: boolean
  substitutions: string[]
  noteReferences: string[]
  provenance: 'deterministic'
  unresolved: string[]
}

const quantityToken = String.raw`(?:\d+\s+\d+\/\d+|\d+\s+[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|(?:\d+(?:\.\d+)?|\.\d+)(?:[¼½¾⅓⅔⅛⅜⅝⅞])?|[¼½¾⅓⅔⅛⅜⅝⅞])`
const leadingQuantity = new RegExp(
  String.raw`^(${quantityToken})(?:\s*(?:-|–|—|to)\s*(${quantityToken}))?(?:\s+|(?=[a-z]))(.+)$`,
  'iu',
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
  sheet: 'sheet',
  sheets: 'sheet',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  pounds: 'lb',
}
const preparationWords = String.raw`(?:(?:finely|roughly|thinly|thickly|freshly)\s+)?(?:diced|chopped|sliced|minced|grated|shredded|peeled|trimmed|crushed|cracked|mashed|smashed|julienned|torn|halved|quartered|cubed|pounded|zested|juiced|washed|deseeded|cut into [^,;()]+)(?:\s+with\s+a\s+fork)?`
const prefixPreparation = new RegExp(String.raw`^(${preparationWords})\s+(.+)$`, 'iu')
const trailingPreparationWords = String.raw`(?:${preparationWords}|toasted|melted|cooled)`
const suffixPreparation = new RegExp(
  String.raw`^(.+?)(?:\s*[,;(]\s*|\s+)(${trailingPreparationWords}(?:\s*(?:,|and)\s*${trailingPreparationWords})*)[)\]]*$`,
  'iu',
)

const measureToken = Object.keys(unitAliases)
  .sort((a, b) => b.length - a.length)
  .join('|')
const equivalentMeasures = new RegExp(
  String.raw`^(${quantityToken})\s*(${measureToken})\s*/\s*(${quantityToken})\s*(${measureToken})\b\s+(.+)$`,
  'iu',
)
const metricUnits = new Set(['g', 'kg', 'ml', 'l'])

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
  const equivalents = name.match(equivalentMeasures)
  let alternateMeasures: IngredientStructure['quantity']['alternateMeasures']
  const packageMatch = name.match(metricPackage)
  let packageAmount: IngredientStructure['quantity']['package']
  const isPackage = packageExpression.test(name.slice(approximation.length))
  const leading = name.slice(approximation.length).match(leadingQuantity)
  if (equivalents && !approximation) {
    const first = {
      text: `${equivalents[1]} ${equivalents[2]}`,
      value: parseIngredientQuantity(equivalents[1]!),
      unit: unitAliases[equivalents[2]!.toLowerCase()]!,
    }
    const second = {
      text: `${equivalents[3]} ${equivalents[4]}`,
      value: parseIngredientQuantity(equivalents[3]!),
      unit: unitAliases[equivalents[4]!.toLowerCase()]!,
    }
    // The slash declares equivalence in the source. Prefer its explicit metric amount;
    // do not add the two amounts or infer a density or spoon/cup convention.
    if (
      first.value !== null &&
      second.value !== null &&
      metricUnits.has(first.unit) !== metricUnits.has(second.unit)
    ) {
      const preferred = metricUnits.has(first.unit) ? first : second
      const alternate = preferred === first ? second : first
      quantityText = preferred === first ? equivalents[1]! : equivalents[3]!
      value = preferred.value
      maximum = value
      unit = preferred.unit
      state = 'known'
      alternateMeasures = [{ text: alternate.text, value: alternate.value!, unit: alternate.unit }]
      name = equivalents[5]!
    } else unresolved.push('alternative_quantity')
  } else if (
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

  // A legacy saved label can retain a measure after losing its numeric amount.
  // Keep that amount unknown while separating the measure from product identity.
  if (quantityText === null) {
    const looseMeasure = name.match(/^(handfuls?|bunch(?:es)?|sheets?)\s+(?:of\s+)?(.+)$/iu)
    if (looseMeasure) {
      unit = unitAliases[looseMeasure[1]!.toLowerCase()]!
      name = looseMeasure[2]!
    }
  }
  if (unit && quantityText !== null) name = name.replace(/^of\s+/iu, '')
  if (/\d.*\s\/\s|^\//u.test(name) && !unresolved.includes('alternative_quantity'))
    unresolved.push('alternative_quantity')
  // A second amount after the parsed measure needs punctuation/source evidence. Do not
  // turn a flattened equivalent (25g 1 1 2 tbsp ...) into a product or reliable stock.
  if (quantityText !== null && /^(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞])/u.test(name)) {
    value = null
    maximum = null
    state = 'unknown'
    if (!unresolved.includes('alternative_quantity')) unresolved.push('alternative_quantity')
    unresolved.push('product_name')
  }
  const sourceName = name
  const noteReferences: string[] = []
  const substitutions: string[] = []
  const notes: string[] = []
  const purposes: string[] = []
  let optional = false
  // Peel only explicit source annotations, before punctuation canonicalisation. Repetition
  // handles notes after preparation or substitutions without per-product replacement rules.
  const annotations: Array<{ pattern: RegExp; collect: (text: string) => void }> = [
    {
      pattern:
        /(?:\s*[,;(]\s*|\s+)((?:see\s+)?notes?(?:\s+\d+(?:\s*(?:,|and|&)\s*\d+)*)?)[.)\]]*$/iu,
      collect: (text) => {
        noteReferences.push(text)
      },
    },
    {
      pattern:
        /(?:\s*[,;(]\s*|\s+)((?:or\s+)?(?:can be (?:substituted|replaced) (?:with|by)|substitute(?: with)?|use instead)\s+.+?)[)\]]*$/iu,
      collect: (text) => {
        substitutions.push(text)
      },
    },
    {
      pattern: /\s+(or\s+[^,;()]+?\s+equivalent)[)\]]*$/iu,
      collect: (text) => {
        substitutions.push(text)
      },
    },
    {
      pattern:
        /(?:\s*[,;(]\s*|\s+)((?:plus\s+)?extra\s+(?:to serve|for serving|for garnishing)|for (?:frying|serving|garnishing|greasing|dusting|pasta water)|to serve|(?:plus\s+)?(?:extra\s+)?to taste|as needed|as required)[)\]]*$/iu,
      collect: (text) => {
        purposes.push(text)
      },
    },
    {
      pattern: /(?:\s*[,;(]\s*|\s+)(optional)[)\]]*$/iu,
      collect: () => {
        optional = true
      },
    },
    {
      pattern: /(?:\s*[,;(–—]\s*|\s+-\s+|\s+)((?:use[ -]any[ -]type|I[ -]used)\b[^()]*)[)\]]*$/iu,
      collect: (text) => {
        notes.push(text)
      },
    },
  ]
  let priorName: string
  do {
    priorName = name
    for (const annotation of annotations) {
      name = name
        .replace(annotation.pattern, (_match, text: string) => {
          annotation.collect(text)
          return ''
        })
        .trim()
        .replace(/[,;]\s*$/u, '')
        .trim()
    }
  } while (name !== priorName)
  const purpose = purposes.reverse().join(', ') || null

  // Parentheses/slashes are evidence of an alternate label, not proof that products
  // are interchangeable. Only the existing bounded identity rules may confirm an alias.
  const alternateLabel =
    name.match(/^(.+?)\s*\((?:also known as\s+|aka\s+)?([^()]+)\)$/iu) ??
    name.match(/^([^/]+?)\s*\/\s*([^/]+)$/u)
  if (alternateLabel && !unresolved.includes('package_quantity')) {
    if (
      canonicalIngredientName(alternateLabel[1]!) === canonicalIngredientName(alternateLabel[2]!)
    ) {
      notes.push(name.slice(alternateLabel[1]!.length).trim())
      name = alternateLabel[1]!.trim()
    } else if (!name.match(suffixPreparation)) unresolved.push('alternative_product')
  }

  const preparations: string[] = []
  const prefix = name.match(prefixPreparation)
  // Preparation grammar applies to arbitrary ingredient names. Explicit purchased forms and
  // common ambiguous processed products stay intact rather than requiring a food whitelist.
  const purchasedForm =
    /\b(canned|tinned|frozen|dried|jar|jarred|commercially|pre[- ]|ready[- ]|packet|packaged|powder|paste)\b/iu.test(
      name,
    )
  const ambiguousProcessedForm =
    /^cracked\s|^(?:diced|crushed)\s+tomato(?:es)?\b|^minced\s+(?:beef|pork|chicken|turkey|lamb|meat)\b|^sliced\s+(?:bread|ham|cheese)\b/iu.test(
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
    .replace(/\b([\p{L}]+)(?:\s+\1\b)+/giu, '$1')
    .trim()
    .replace(/[,;]\s*$/u, '')
    .trim()
  if (!name) {
    name = originalText.trim()
    unresolved.push('product_name')
  }
  if (
    (/\b(?:or|and\/or)\b/iu.test(name) || name.includes('/')) &&
    !unresolved.includes('alternative_product')
  )
    unresolved.push('alternative_product')
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
      ...(alternateMeasures ? { alternateMeasures } : {}),
      ...(packageAmount ? { package: packageAmount } : {}),
    },
    preparation: preparations.join(', ') || null,
    purpose,
    ...(notes.length ? { notes: notes.reverse() } : {}),
    ...(optional ? { optional } : {}),
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
    (structure.quantity.text === null &&
      !structure.unresolved.some((reason) =>
        ['package_quantity', 'alternative_quantity'].includes(reason),
      ))
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
