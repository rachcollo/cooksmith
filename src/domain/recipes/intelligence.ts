import {
  normaliseMeasure,
  recipeMeasures,
  type MeasurementSystem,
} from '../measurements/purchaseMeasures.ts'
import { structureExistingIngredient, type IngredientStructure } from './ingredientStructure.ts'
export const recipeIntelligenceSchemaVersion = 'recipe-intelligence-v3'
export const recipeIntelligenceRulesVersion = 'cooksmith-rules-v4'

export type RecipePreparationOpportunityKind =
  'ingredient_prep' | 'component_prep' | 'component_cook' | 'meal_cook' | 'assembly'

export type EnrichmentProvenance = 'deterministic' | 'model' | 'unknown'
export type EnrichmentConfidence = 'high' | 'medium' | 'low' | 'unknown'
export type QuantityState = 'known' | 'range' | 'approximate' | 'unknown' | 'not_applicable'

export type RecipeIntelligenceIngredient = {
  structure?: IngredientStructure
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

export type RecipePreparationOpportunity = {
  opportunityId: string
  title: string
  canonicalIngredient: string
  action: string
  kind?: RecipePreparationOpportunityKind
  preparationDetail: string | null
  sourceIngredientIds: string[]
  sourceStepIds: string[]
  ingredientLines?: string[]
  instructionSteps?: string[]
  stoppingPoint?: string
  storageGuidance?: string
  finishingGuidance?: string
  estimatedMinutes: number
  estimatedTimeSavedMinutes: number
  maximumLeadTimeHours: number
  boundaries: Array<
    'batch-component' | 'cross-contamination' | 'raw-protein' | 'storage' | 'timing'
  >
  confidence: EnrichmentConfidence
}

export type RecipeIntelligence = {
  sourceContext?: {
    kind: string
    versionId: string
    measurementSystem: MeasurementSystem
    measureSource: string | null
  }
  schemaVersion: typeof recipeIntelligenceSchemaVersion
  rulesVersion: typeof recipeIntelligenceRulesVersion
  recipeId: string
  recipeFingerprint: string
  ingredients: RecipeIntelligenceIngredient[]
  preparationOpportunities: RecipePreparationOpportunity[]
  unresolvedIngredientIds: string[]
  overallConfidence: EnrichmentConfidence
}

export type ProviderIngredientSuggestion = Pick<
  RecipeIntelligenceIngredient,
  | 'sourceIngredientId'
  | 'canonicalName'
  | 'aliases'
  | 'modifiers'
  | 'quantity'
  | 'action'
  | 'preparationDetail'
  | 'sourceStepIds'
  | 'confidence'
>

export type ProviderPreparationOpportunity = RecipePreparationOpportunity

export type RecipeIntelligenceSource = {
  sourceKind?: 'household' | 'shared_platform'
  versionId?: string
  measurementSystem?: MeasurementSystem
  sourceUrl?: string | null
  recipeId: string
  recipeFingerprint: string
  ingredients: Array<{
    id: string
    name: string
    originalText: string
    quantityText: string | null
    unit: string | null
    preparation: string | null
    parserVersion?: string | null
  }>
  steps: Array<{ id: string; instruction: string }>
}

function hasUniqueStrings(values: string[]) {
  return new Set(values).size === values.length
}

export function hasUniqueProviderSuggestionValues(
  suggestion: ProviderIngredientSuggestion,
): boolean {
  return (
    hasUniqueStrings(suggestion.aliases) &&
    hasUniqueStrings(suggestion.modifiers) &&
    hasUniqueStrings(suggestion.sourceStepIds)
  )
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

function structureQuantity(
  structure: IngredientStructure,
  system: MeasurementSystem = 'unknown',
): RecipeIntelligenceIngredient['quantity'] {
  const quantity = structure.quantity
  const sourceUnit = quantity.unit ? units[normaliseText(quantity.unit)] : undefined
  const unit =
    sourceUnit && system !== 'unknown' && ['tsp', 'tbsp', 'cup'].includes(sourceUnit.unit)
      ? { ...normaliseMeasure(sourceUnit.unit, system), dimension: 'volume' as const }
      : sourceUnit
  return {
    state: quantity.state,
    original: quantity.text,
    normalisedValue: quantity.value === null ? null : quantity.value * (unit?.multiplier ?? 1),
    normalisedMaximum:
      quantity.maximum === null ? null : quantity.maximum * (unit?.multiplier ?? 1),
    unit: unit?.unit ?? quantity.unit,
    dimension:
      quantity.value === null
        ? 'unknown'
        : (unit?.dimension ?? (quantity.unit ? 'unknown' : 'count')),
  }
}

/** Only source-bound single-ingredient preparation can reuse the purchase identity. */
export function ingredientPreparationEvidence(
  intelligence: RecipeIntelligence,
  opportunity: RecipePreparationOpportunity,
) {
  const ingredient = intelligence.ingredients.find((item) =>
    opportunity.sourceIngredientIds.includes(item.sourceIngredientId),
  )
  const structure =
    opportunity.kind === 'ingredient_prep' && opportunity.sourceIngredientIds.length === 1
      ? ingredient?.structure
      : undefined
  return {
    canonicalIngredient: structure?.canonicalName ?? opportunity.canonicalIngredient,
    preparationDetail: structure?.preparation ?? opportunity.preparationDetail,
    quantity: ingredient?.structure
      ? structureQuantity(ingredient.structure, intelligence.sourceContext?.measurementSystem)
      : ingredient?.quantity,
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
    const structure = structureExistingIngredient({
      name: ingredient.name,
      quantity: ingredient.quantityText,
      unit: ingredient.unit,
      preparation: ingredient.preparation,
      originalLineText: ingredient.originalText,
      parserVersion:
        ingredient.parserVersion ?? (ingredient.preparation ? 'manual' : 'recipe-content-v1'),
    })
    const normalisedName = normaliseText(structure.name)
    const canonicalName = aliases[normalisedName] ?? normalisedName
    const detail = preparationDetail(structure.preparation) ?? structure.preparation
    const sourceStepIds = linkedStepIds(canonicalName, source.steps)

    return {
      structure,
      sourceIngredientId: ingredient.id,
      originalText: ingredient.originalText,
      canonicalName,
      aliases: canonicalName === normalisedName ? [] : [normalisedName],
      modifiers: [],
      quantity: structureQuantity(structure, recipeMeasures(source).system),
      action: detail?.split(' ').at(-1) ?? null,
      preparationDetail: detail,
      sourceStepIds,
      provenance: 'deterministic' as const,
      confidence: sourceStepIds.length > 0 ? ('high' as const) : ('medium' as const),
    }
  })

  return {
    ...(source.sourceKind && source.versionId
      ? {
          sourceContext: {
            kind: source.sourceKind,
            versionId: source.versionId,
            measurementSystem: recipeMeasures(source).system,
            measureSource: recipeMeasures(source).source,
          },
        }
      : {}),
    schemaVersion: recipeIntelligenceSchemaVersion,
    rulesVersion: recipeIntelligenceRulesVersion,
    recipeId: source.recipeId,
    recipeFingerprint: source.recipeFingerprint,
    ingredients,
    preparationOpportunities: [],
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

export function applyProviderIngredientSuggestions(
  source: RecipeIntelligenceSource,
  deterministic: RecipeIntelligence,
  suggestions: ProviderIngredientSuggestion[],
  opportunities: ProviderPreparationOpportunity[] = [],
): RecipeIntelligence {
  const ingredientIds = source.ingredients.map((ingredient) => ingredient.id)
  const stepIds = new Set(source.steps.map((step) => step.id))
  if (
    new Set(opportunities.map((item) => item.opportunityId)).size !== opportunities.length ||
    opportunities.some(
      (item) =>
        item.sourceIngredientIds.length === 0 ||
        !hasUniqueStrings(item.sourceIngredientIds) ||
        !hasUniqueStrings(item.sourceStepIds) ||
        item.sourceIngredientIds.some((id) => !ingredientIds.includes(id)) ||
        item.sourceStepIds.some((id) => !stepIds.has(id)) ||
        item.title.trim().length < 4 ||
        item.title.length > 72 ||
        /\b(use within|refrigerat|freeze|storage)\b/i.test(
          `${item.title} ${item.preparationDetail ?? ''}`,
        ) ||
        item.canonicalIngredient.trim().length === 0 ||
        item.action.trim().length === 0 ||
        !['ingredient_prep', 'component_prep', 'component_cook', 'meal_cook', 'assembly'].includes(
          item.kind ?? '',
        ) ||
        !item.ingredientLines?.length ||
        !item.instructionSteps?.length ||
        item.instructionSteps.length > 12 ||
        item.instructionSteps.some((step) => step.trim().length < 3 || step.length > 300) ||
        !item.stoppingPoint ||
        item.stoppingPoint.trim().length < 3 ||
        !item.storageGuidance ||
        item.storageGuidance.trim().length < 3 ||
        !item.finishingGuidance ||
        item.finishingGuidance.trim().length < 3 ||
        !Number.isInteger(item.estimatedMinutes) ||
        item.estimatedMinutes < 3 ||
        item.estimatedMinutes > 120 ||
        !Number.isInteger(item.estimatedTimeSavedMinutes) ||
        item.estimatedTimeSavedMinutes < 0 ||
        item.estimatedTimeSavedMinutes > 180 ||
        !Number.isInteger(item.maximumLeadTimeHours) ||
        item.maximumLeadTimeHours < 1 ||
        item.maximumLeadTimeHours > 168,
    )
  )
    throw new Error('unsupported_data')
  if (
    suggestions.length !== ingredientIds.length ||
    new Set(suggestions.map((item) => item.sourceIngredientId)).size !== ingredientIds.length ||
    suggestions.some(
      (item) =>
        !ingredientIds.includes(item.sourceIngredientId) ||
        !hasUniqueProviderSuggestionValues(item) ||
        item.sourceStepIds.some((id) => !stepIds.has(id)),
    )
  )
    throw new Error('unsupported_data')

  const ingredients = deterministic.ingredients.map((ingredient) => {
    const suggestion = suggestions.find(
      (item) => item.sourceIngredientId === ingredient.sourceIngredientId,
    )
    if (!suggestion) throw new Error('unsupported_data')
    return {
      ...ingredient,
      ...suggestion,
      originalText: ingredient.originalText,
      provenance: 'model' as const,
    }
  })

  const overallConfidence: EnrichmentConfidence =
    ingredients.length === 0
      ? 'unknown'
      : ingredients.every((ingredient) => ingredient.confidence === 'high')
        ? 'high'
        : ingredients.some((ingredient) => ingredient.confidence === 'low')
          ? 'low'
          : 'medium'

  return {
    ...deterministic,
    ingredients,
    preparationOpportunities: opportunities,
    unresolvedIngredientIds: ingredients
      .filter(
        (ingredient) =>
          !ingredient.canonicalName ||
          (!ingredient.action &&
            !ingredient.preparationDetail &&
            ingredient.sourceStepIds.length === 0),
      )
      .map((ingredient) => ingredient.sourceIngredientId),
    overallConfidence,
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
    candidate.rulesVersion !== recipeIntelligenceRulesVersion ||
    !Array.isArray(candidate.ingredients) ||
    !Array.isArray(candidate.preparationOpportunities)
  )
    return { ok: false, reason: 'source_mismatch' }

  const ingredientIds = new Set(source.ingredients.map((ingredient) => ingredient.id))
  const stepIds = new Set(source.steps.map((step) => step.id))
  if (
    candidate.ingredients.length !== ingredientIds.size ||
    new Set(candidate.ingredients.map((ingredient) => ingredient.sourceIngredientId)).size !==
      ingredientIds.size
  )
    return { ok: false, reason: 'unsupported_reference' }

  if (
    candidate.preparationOpportunities.some(
      (opportunity) =>
        !opportunity ||
        !Array.isArray(opportunity.sourceIngredientIds) ||
        opportunity.sourceIngredientIds.length === 0 ||
        opportunity.sourceIngredientIds.some((id) => !ingredientIds.has(id)) ||
        !Array.isArray(opportunity.sourceStepIds) ||
        opportunity.sourceStepIds.some((id) => !stepIds.has(id)),
    )
  )
    return { ok: false, reason: 'unsupported_reference' }
  if (
    candidate.ingredients.some(
      (ingredient) =>
        !ingredient ||
        !ingredientIds.has(ingredient.sourceIngredientId) ||
        ingredient.originalText !==
          source.ingredients.find((item) => item.id === ingredient.sourceIngredientId)
            ?.originalText ||
        !Array.isArray(ingredient.sourceStepIds) ||
        ingredient.sourceStepIds.some((id) => !stepIds.has(id)),
    )
  )
    return { ok: false, reason: 'unsupported_reference' }

  const expected = buildDeterministicRecipeIntelligence(source)
  if (JSON.stringify(candidate.sourceContext) !== JSON.stringify(expected.sourceContext))
    return { ok: false, reason: 'source_mismatch' }
  if (
    candidate.ingredients.some(
      (ingredient) =>
        JSON.stringify(ingredient.structure) !==
        JSON.stringify(
          expected.ingredients.find(
            (item) => item.sourceIngredientId === ingredient.sourceIngredientId,
          )?.structure,
        ),
    )
  )
    return { ok: false, reason: 'ingredient_structure_mismatch' }
  return { ok: true, value: candidate as RecipeIntelligence }
}
