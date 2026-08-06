import type {
  EnrichmentConfidence,
  ProviderIngredientSuggestion,
  ProviderPreparationOpportunity,
  QuantityState,
  RecipeIntelligence,
  RecipeIntelligenceSource,
} from '../../../src/domain/recipes/intelligence.ts'
import { applyProviderIngredientSuggestions } from '../../../src/domain/recipes/intelligence.ts'
import {
  compactRecipeSource,
  normaliseProviderOutput,
} from '../../../src/domain/recipes/providerEnrichment.ts'

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

type OpenAIErrorResponse = {
  error?: { code?: unknown; type?: unknown; message?: unknown; param?: unknown }
}

function isProviderTimeout(error: unknown) {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

export class ProviderRequestError extends Error {
  constructor(
    readonly category: 'transient_provider' | 'permanent_provider',
    readonly status: number,
    readonly providerCode: string,
    readonly providerParam: string | null,
    readonly requestId: string | null,
    readonly schemaKeyword: string | null,
  ) {
    super(category)
  }
}

const confidenceValues: EnrichmentConfidence[] = ['high', 'medium', 'low', 'unknown']
const quantityStates: QuantityState[] = [
  'known',
  'range',
  'approximate',
  'unknown',
  'not_applicable',
]
const dimensions = ['mass', 'volume', 'count', 'unknown'] as const
const opportunityBoundaries = [
  'batch-component',
  'cross-contamination',
  'raw-protein',
  'storage',
  'timing',
] as const
const preparationActions = [
  'bake',
  'blend',
  'boil',
  'chop',
  'dice',
  'grate',
  'marinate',
  'mince',
  'mix',
  'cook',
  'roast',
  'roughly_chop',
  'shred',
  'slice',
  'simmer',
  'steam',
  'toast',
  'whisk',
] as const
const opportunityKinds = [
  'ingredient_prep',
  'component_prep',
  'component_cook',
  'meal_cook',
  'assembly',
] as const

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isSuggestion(value: unknown): value is ProviderIngredientSuggestion {
  if (!value || typeof value !== 'object') return false
  const suggestion = value as Partial<ProviderIngredientSuggestion>
  const quantity = suggestion.quantity as
    Partial<ProviderIngredientSuggestion['quantity']> | undefined
  return (
    typeof suggestion.sourceIngredientId === 'string' &&
    isNullableString(suggestion.canonicalName) &&
    Array.isArray(suggestion.aliases) &&
    suggestion.aliases.every((item) => typeof item === 'string') &&
    Array.isArray(suggestion.modifiers) &&
    suggestion.modifiers.every((item) => typeof item === 'string') &&
    isNullableString(suggestion.action) &&
    isNullableString(suggestion.preparationDetail) &&
    Array.isArray(suggestion.sourceStepIds) &&
    suggestion.sourceStepIds.every((item) => typeof item === 'string') &&
    confidenceValues.includes(suggestion.confidence as EnrichmentConfidence) &&
    Boolean(quantity) &&
    quantityStates.includes(quantity?.state as QuantityState) &&
    isNullableString(quantity?.original) &&
    (quantity?.normalisedValue === null || typeof quantity?.normalisedValue === 'number') &&
    (quantity?.normalisedMaximum === null || typeof quantity?.normalisedMaximum === 'number') &&
    isNullableString(quantity?.unit) &&
    dimensions.includes(quantity?.dimension as (typeof dimensions)[number])
  )
}

function isOpportunity(value: unknown): value is ProviderPreparationOpportunity {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ProviderPreparationOpportunity>
  return (
    typeof item.opportunityId === 'string' &&
    typeof item.title === 'string' &&
    typeof item.canonicalIngredient === 'string' &&
    preparationActions.includes(item.action as (typeof preparationActions)[number]) &&
    opportunityKinds.includes(item.kind as (typeof opportunityKinds)[number]) &&
    isNullableString(item.preparationDetail) &&
    Array.isArray(item.sourceIngredientIds) &&
    item.sourceIngredientIds.every((id) => typeof id === 'string') &&
    Array.isArray(item.sourceStepIds) &&
    item.sourceStepIds.every((id) => typeof id === 'string') &&
    Array.isArray(item.ingredientLines) &&
    item.ingredientLines.every((line) => typeof line === 'string') &&
    Array.isArray(item.instructionSteps) &&
    item.instructionSteps.every((step) => typeof step === 'string') &&
    typeof item.stoppingPoint === 'string' &&
    typeof item.storageGuidance === 'string' &&
    typeof item.finishingGuidance === 'string' &&
    Number.isInteger(item.estimatedMinutes) &&
    Number.isInteger(item.estimatedTimeSavedMinutes) &&
    Number.isInteger(item.maximumLeadTimeHours) &&
    Array.isArray(item.boundaries) &&
    item.boundaries.every((boundary) =>
      opportunityBoundaries.includes(boundary as (typeof opportunityBoundaries)[number]),
    ) &&
    confidenceValues.includes(item.confidence as EnrichmentConfidence)
  )
}

export async function resolveAmbiguousLinks(input: {
  apiKey: string
  model: string
  source: RecipeIntelligenceSource
  deterministic: RecipeIntelligence
  timeoutMs: number
}) {
  if (input.source.ingredients.length === 0)
    return { result: input.deterministic, inputTokens: 0, outputTokens: 0 }

  const ingredientIds = input.source.ingredients.map((ingredient) => ingredient.id)
  const stepIds = input.source.steps.map((step) => step.id)
  const nullableString = { type: ['string', 'null'] }
  const nullableNumber = { type: ['number', 'null'] }
  const payload = {
    model: input.model,
    input: [
      {
        role: 'system',
        content:
          'Structure the supplied complete recipe into ingredient intelligence and bounded make-ahead stages. Return one ingredient result for every supplied ingredient ID. For each worthwhile stage choose ingredient_prep, component_prep, component_cook, meal_cook or assembly. Prefer fully cooking sauces, ragus, curries, stews, braises, soups and other components when safe and when this saves substantially more meal-night time without harming quality. Each opportunity must be independently completable, materially useful, and use only supplied ingredient and step IDs. ingredientLines and instructionSteps must contain only what is needed to complete this opportunity. End instructionSteps exactly at stoppingPoint: never continue into the next recipe stage. Include safe storageGuidance and concise finishingGuidance for meal night. Do not include filler such as preheating, boiling water, serving, garnishing or melting butter alone. Estimate an average home cook and count setup and cleanup once. Mark raw protein boundaries. Use null or unknown when evidence does not support an ingredient value.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          ...compactRecipeSource(input.source),
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'recipe_ingredient_intelligence',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['ingredients', 'preparationOpportunities'],
          properties: {
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'sourceIngredientId',
                  'canonicalName',
                  'aliases',
                  'modifiers',
                  'quantity',
                  'action',
                  'preparationDetail',
                  'sourceStepIds',
                  'confidence',
                ],
                properties: {
                  sourceIngredientId: { type: 'string', enum: ingredientIds },
                  canonicalName: nullableString,
                  aliases: { type: 'array', items: { type: 'string' } },
                  modifiers: { type: 'array', items: { type: 'string' } },
                  quantity: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                      'state',
                      'original',
                      'normalisedValue',
                      'normalisedMaximum',
                      'unit',
                      'dimension',
                    ],
                    properties: {
                      state: { type: 'string', enum: quantityStates },
                      original: nullableString,
                      normalisedValue: nullableNumber,
                      normalisedMaximum: nullableNumber,
                      unit: nullableString,
                      dimension: { type: 'string', enum: dimensions },
                    },
                  },
                  action: nullableString,
                  preparationDetail: nullableString,
                  sourceStepIds: {
                    type: 'array',
                    items:
                      stepIds.length > 0 ? { type: 'string', enum: stepIds } : { type: 'string' },
                  },
                  confidence: { type: 'string', enum: confidenceValues },
                },
              },
            },
            preparationOpportunities: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'opportunityId',
                  'title',
                  'canonicalIngredient',
                  'action',
                  'kind',
                  'preparationDetail',
                  'sourceIngredientIds',
                  'sourceStepIds',
                  'ingredientLines',
                  'instructionSteps',
                  'stoppingPoint',
                  'storageGuidance',
                  'finishingGuidance',
                  'estimatedMinutes',
                  'estimatedTimeSavedMinutes',
                  'maximumLeadTimeHours',
                  'boundaries',
                  'confidence',
                ],
                properties: {
                  opportunityId: { type: 'string' },
                  title: { type: 'string' },
                  canonicalIngredient: { type: 'string' },
                  action: { type: 'string', enum: preparationActions },
                  kind: { type: 'string', enum: opportunityKinds },
                  preparationDetail: nullableString,
                  sourceIngredientIds: {
                    type: 'array',
                    items: { type: 'string', enum: ingredientIds },
                  },
                  sourceStepIds: {
                    type: 'array',
                    items:
                      stepIds.length > 0 ? { type: 'string', enum: stepIds } : { type: 'string' },
                  },
                  ingredientLines: { type: 'array', items: { type: 'string' } },
                  instructionSteps: { type: 'array', items: { type: 'string' } },
                  stoppingPoint: { type: 'string' },
                  storageGuidance: { type: 'string' },
                  finishingGuidance: { type: 'string' },
                  estimatedMinutes: { type: 'integer' },
                  estimatedTimeSavedMinutes: { type: 'integer' },
                  maximumLeadTimeHours: { type: 'integer' },
                  boundaries: {
                    type: 'array',
                    items: { type: 'string', enum: opportunityBoundaries },
                  },
                  confidence: { type: 'string', enum: confidenceValues },
                },
              },
            },
          },
        },
      },
    },
  }

  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(input.timeoutMs),
    })
  } catch (error) {
    if (isProviderTimeout(error)) throw new Error('timeout')
    throw error
  }
  if (!response.ok) {
    const category =
      response.status === 429 || response.status >= 500
        ? 'transient_provider'
        : 'permanent_provider'
    let providerCode = 'unknown'
    let providerParam: string | null = null
    let schemaKeyword: string | null = null
    const rawRequestId = response.headers.get('x-request-id') ?? ''
    const requestId = /^[a-z0-9_-]{1,100}$/i.test(rawRequestId) ? rawRequestId : null
    try {
      const body = (await response.json()) as OpenAIErrorResponse
      const rawCode =
        typeof body.error?.code === 'string'
          ? body.error.code
          : typeof body.error?.type === 'string'
            ? body.error.type
            : ''
      if (/^[a-z0-9_.-]{1,80}$/i.test(rawCode)) providerCode = rawCode
      const rawParam = typeof body.error?.param === 'string' ? body.error.param : ''
      if (
        rawParam.length >= 1 &&
        rawParam.length <= 160 &&
        [...rawParam].every((character) => /^[a-z0-9_.-]$/i.test(character))
      )
        providerParam = rawParam
      const rawMessage = typeof body.error?.message === 'string' ? body.error.message : ''
      const keyword = rawMessage.match(/'([A-Za-z][A-Za-z0-9_-]{0,79})' is not permitted/i)?.[1]
      if (keyword) schemaKeyword = keyword
    } catch {
      // Status and category remain sufficient when the provider body is unavailable.
    }
    throw new ProviderRequestError(
      category,
      response.status,
      providerCode,
      providerParam,
      requestId,
      schemaKeyword,
    )
  }

  const body = (await response.json()) as OpenAIResponse
  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('schema_invalid')

  let parsed: { ingredients?: unknown[]; preparationOpportunities?: unknown[] }
  try {
    parsed = JSON.parse(text) as {
      ingredients?: unknown[]
      preparationOpportunities?: unknown[]
    }
  } catch {
    throw new Error('schema_invalid')
  }
  if (
    !Array.isArray(parsed.ingredients) ||
    parsed.ingredients.length !== ingredientIds.length ||
    !parsed.ingredients.every(isSuggestion) ||
    !Array.isArray(parsed.preparationOpportunities) ||
    !parsed.preparationOpportunities.every(isOpportunity)
  )
    throw new Error('schema_invalid')

  const normalised = normaliseProviderOutput({
    ingredients: parsed.ingredients,
    preparationOpportunities: parsed.preparationOpportunities,
  })
  const result = applyProviderIngredientSuggestions(
    input.source,
    input.deterministic,
    normalised.ingredients,
    normalised.preparationOpportunities,
  )

  return {
    result,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}
