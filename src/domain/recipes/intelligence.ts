export const recipeIntelligenceSchemaVersion = 'recipe-intelligence-v1'
export const recipeIntelligenceRulesVersion = 'cooksmith-rules-v1'

export type EnrichmentProvenance = 'deterministic' | 'model' | 'unknown'
export type EnrichmentConfidence = 'high' | 'medium' | 'low' | 'unknown'
export type QuantityState = 'known' | 'range' | 'approximate' | 'unknown' | 'not_applicable'

export type RecipeIntelligenceIngredient = {
  sourceIngredientId: string
  originalText: string
  canonicalName: string | null
  aliases: string[]
  modifiers: string[]
  quantity: {
    state: QuantityState
    original: string | null
    normalisedValue: number | null
    normalisedMaximum: number | null
    unit: string | null
    dimension: 'mass' | 'volume' | 'count' | 'unknown'
  }
  action: string | null
  preparationDetail: string | null
  sourceStepIds: string[]
  provenance: EnrichmentProvenance
  confidence: EnrichmentConfidence
}

export type RecipeIntelligence = {
  schemaVersion: typeof recipeIntelligenceSchemaVersion
  rulesVersion: typeof recipeIntelligenceRulesVersion
  recipeId: string
  recipeFingerprint: string
  ingredients: RecipeIntelligenceIngredient[]
  unresolvedIngredientIds: string[]
  overallConfidence: EnrichmentConfidence
}

export type RecipeIntelligenceSource = {
  recipeId: string
  recipeFingerprint: string
  ingredients: Array<{
    id: string
    name: string
    originalText: string
    quantityText: string | null
    unit: string | null
    preparation: string | null
  }>
  steps: Array<{ id: string; instruction: string }>
}

const aliases: Record<string, string> = {
  'brown onion': 'onion',
  onions: 'onion',
  'yellow onion': 'onion',
  scallion: 'spring onion',
  scallions: 'spring onion',
  'green onion': 'spring onion',
  'green onions': 'spring onion',
}

const units: Record<
  string,
  { unit: string; multiplier: number; dimension: 'mass' | 'volume' | 'count' }
> = {
  g: { unit: 'g', multiplier: 1, dimension: 'mass' },
  gram: { unit: 'g', multiplier: 1, dimension: 'mass' },
  grams: { unit: 'g', multiplier: 1, dimension: 'mass' },
  kg: { unit: 'g', multiplier: 1000, dimension: 'mass' },
  oz: { unit: 'g', multiplier: 28.3495, dimension: 'mass' },
  ounce: { unit: 'g', multiplier: 28.3495, dimension: 'mass' },
  ounces: { unit: 'g', multiplier: 28.3495, dimension: 'mass' },
  lb: { unit: 'g', multiplier: 453.592, dimension: 'mass' },
  lbs: { unit: 'g', multiplier: 453.592, dimension: 'mass' },
  ml: { unit: 'ml', multiplier: 1, dimension: 'volume' },
  l: { unit: 'ml', multiplier: 1000, dimension: 'volume' },
  litre: { unit: 'ml', multiplier: 1000, dimension: 'volume' },
  litres: { unit: 'ml', multiplier: 1000, dimension: 'volume' },
  tsp: { unit: 'tsp', multiplier: 1, dimension: 'volume' },
  teaspoon: { unit: 'tsp', multiplier: 1, dimension: 'volume' },
  teaspoons: { unit: 'tsp', multiplier: 1, dimension: 'volume' },
  tbsp: { unit: 'tbsp', multiplier: 1, dimension: 'volume' },
  tablespoon: { unit: 'tbsp', multiplier: 1, dimension: 'volume' },
  tablespoons: { unit: 'tbsp', multiplier: 1, dimension: 'volume' },
  cup: { unit: 'cup', multiplier: 1, dimension: 'volume' },
  cups: { unit: 'cup', multiplier: 1, dimension: 'volume' },
}

const preparations = [
  'finely diced',
  'roughly chopped',
  'finely chopped',
  'thinly sliced',
  'diced',
  'chopped',
  'sliced',
  'minced',
  'grated',
] as const

function normaliseText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  const fraction = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  return null
}

function parseQuantity(quantityText: string | null, unitText: string | null) {
  if (!quantityText) {
    return {
      state: 'unknown' as const,
      original: null,
      normalisedValue: null,
      normalisedMaximum: null,
      unit: unitText ? normaliseText(unitText) : null,
      dimension: 'unknown' as const,
    }
  }

  const approximate = /^(about|approx(?:imately)?|~)\s*/i.test(quantityText)
  const cleaned = quantityText.replace(/^(about|approx(?:imately)?|~)\s*/i, '')
  const range = cleaned.match(/^(.+?)\s*(?:-|–|to)\s*(.+)$/)
  const minimum = parseNumber(range?.[1] ?? cleaned)
  const maximum = range ? parseNumber(range[2] ?? '') : minimum
  const unit = unitText ? units[normaliseText(unitText)] : undefined

  if (minimum === null || maximum === null) {
    return {
      state: 'unknown' as const,
      original: quantityText,
      normalisedValue: null,
      normalisedMaximum: null,
      unit: unitText ? normaliseText(unitText) : null,
      dimension: 'unknown' as const,
    }
  }

  return {
    state: range ? ('range' as const) : approximate ? ('approximate' as const) : ('known' as const),
    original: quantityText,
    normalisedValue: minimum * (unit?.multiplier ?? 1),
    normalisedMaximum: maximum * (unit?.multiplier ?? 1),
    unit: unit?.unit ?? (unitText ? normaliseText(unitText) : null),
    dimension: unit?.dimension ?? ('count' as const),
  }
}

function preparationDetail(preparation: string | null) {
  const normalised = preparation ? normaliseText(preparation) : ''
  return preparations.find((candidate) => normalised.includes(candidate)) ?? null
}

function linkedStepIds(name: string, steps: RecipeIntelligenceSource['steps']): string[] {
  const needle = aliases[normaliseText(name)] ?? normaliseText(name)
  return steps
    .filter((step) => {
      const instruction = normaliseText(step.instruction)
      return (
        instruction.includes(needle) ||
        Object.entries(aliases).some(
          ([alias, canonical]) => canonical === needle && instruction.includes(alias),
        )
      )
    })
    .map((step) => step.id)
}

export function buildDeterministicRecipeIntelligence(
  source: RecipeIntelligenceSource,
): RecipeIntelligence {
  const ingredients = source.ingredients.map((ingredient) => {
    const normalisedName = normaliseText(ingredient.name)
    const canonicalName = aliases[normalisedName] ?? normalisedName
    const detail = preparationDetail(ingredient.preparation)
    const sourceStepIds = linkedStepIds(canonicalName, source.steps)

    return {
      sourceIngredientId: ingredient.id,
      originalText: ingredient.originalText,
      canonicalName,
      aliases: canonicalName === normalisedName ? [] : [normalisedName],
      modifiers: [],
      quantity: parseQuantity(ingredient.quantityText, ingredient.unit),
      action: detail?.split(' ').at(-1) ?? null,
      preparationDetail: detail,
      sourceStepIds,
      provenance: 'deterministic' as const,
      confidence: sourceStepIds.length > 0 ? ('high' as const) : ('medium' as const),
    }
  })

  return {
    schemaVersion: recipeIntelligenceSchemaVersion,
    rulesVersion: recipeIntelligenceRulesVersion,
    recipeId: source.recipeId,
    recipeFingerprint: source.recipeFingerprint,
    ingredients,
    unresolvedIngredientIds: ingredients
      .filter((ingredient) => ingredient.sourceStepIds.length === 0)
      .map((ingredient) => ingredient.sourceIngredientId),
    overallConfidence: ingredients.every((ingredient) => ingredient.confidence === 'high')
      ? 'high'
      : ingredients.length > 0
        ? 'medium'
        : 'unknown',
  }
}

export function validateProviderEnrichment(
  source: RecipeIntelligenceSource,
  value: unknown,
): { ok: true; value: RecipeIntelligence } | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') return { ok: false, reason: 'schema_invalid' }
  const candidate = value as Partial<RecipeIntelligence>
  if (
    candidate.recipeId !== source.recipeId ||
    candidate.recipeFingerprint !== source.recipeFingerprint ||
    candidate.schemaVersion !== recipeIntelligenceSchemaVersion ||
    !Array.isArray(candidate.ingredients)
  )
    return { ok: false, reason: 'source_mismatch' }

  const ingredientIds = new Set(source.ingredients.map((ingredient) => ingredient.id))
  const stepIds = new Set(source.steps.map((step) => step.id))
  if (
    candidate.ingredients.some(
      (ingredient) =>
        !ingredientIds.has(ingredient.sourceIngredientId) ||
        ingredient.sourceStepIds.some((id) => !stepIds.has(id)),
    )
  )
    return { ok: false, reason: 'unsupported_reference' }

  return { ok: true, value: candidate as RecipeIntelligence }
}
