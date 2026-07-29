import type {
  EnrichmentConfidence,
  ProviderIngredientSuggestion,
  QuantityState,
  RecipeIntelligence,
  RecipeIntelligenceSource,
} from '../../../src/domain/recipes/intelligence.ts'
import {
  applyProviderIngredientSuggestions,
  hasUniqueProviderSuggestionValues,
} from '../../../src/domain/recipes/intelligence.ts'

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

type OpenAIErrorResponse = {
  error?: { code?: unknown; type?: unknown; message?: unknown }
}

export class ProviderRequestError extends Error {
  constructor(
    readonly category: 'transient_provider' | 'permanent_provider',
    readonly status: number,
    readonly providerCode: string,
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

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isSuggestion(value: unknown): value is ProviderIngredientSuggestion {
  if (!value || typeof value !== 'object') return false
  const suggestion = value as Partial<ProviderIngredientSuggestion>
  const quantity = suggestion.quantity as
    | Partial<ProviderIngredientSuggestion['quantity']>
    | undefined
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
    hasUniqueProviderSuggestionValues(suggestion as ProviderIngredientSuggestion) &&
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
          'Structure only the supplied recipe evidence. Return one result for every supplied ingredient ID. Canonical names must exclude quantities, units, brackets and preparation wording. Preserve meaningful cut differences. Do not invent ingredients, steps, quantities, actions, aliases, storage advice, food-safety advice or other facts. Use null or unknown when the evidence does not support a value.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          ingredients: input.source.ingredients.map(
            ({ id, name, originalText, quantityText, unit, preparation }) => ({
              id,
              name,
              originalText,
              quantityText,
              unit,
              preparation,
            }),
          ),
          steps: input.source.steps,
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
          required: ['ingredients'],
          properties: {
            ingredients: {
              type: 'array',
              minItems: ingredientIds.length,
              maxItems: ingredientIds.length,
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
                      stepIds.length > 0
                        ? { type: 'string', enum: stepIds }
                        : { type: 'string' },
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

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(input.timeoutMs),
  })
  if (!response.ok) {
    const category =
      response.status === 429 || response.status >= 500
        ? 'transient_provider'
        : 'permanent_provider'
    let providerCode = 'unknown'
    let schemaKeyword: string | null = null
    try {
      const body = (await response.json()) as OpenAIErrorResponse
      const rawCode =
        typeof body.error?.code === 'string'
          ? body.error.code
          : typeof body.error?.type === 'string'
            ? body.error.type
            : ''
      if (/^[a-z0-9_.-]{1,80}$/i.test(rawCode)) providerCode = rawCode
      const rawMessage = typeof body.error?.message === 'string' ? body.error.message : ''
      const keyword = rawMessage.match(/'([A-Za-z][A-Za-z0-9_-]{0,79})' is not permitted/i)?.[1]
      if (keyword) schemaKeyword = keyword
    } catch {
      // Status and category remain sufficient when the provider body is unavailable.
    }
    throw new ProviderRequestError(category, response.status, providerCode, schemaKeyword)
  }

  const body = (await response.json()) as OpenAIResponse
  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('schema_invalid')

  let parsed: { ingredients?: unknown[] }
  try {
    parsed = JSON.parse(text) as { ingredients?: unknown[] }
  } catch {
    throw new Error('schema_invalid')
  }
  if (
    !Array.isArray(parsed.ingredients) ||
    parsed.ingredients.length !== ingredientIds.length ||
    !parsed.ingredients.every(isSuggestion)
  )
    throw new Error('schema_invalid')

  const result = applyProviderIngredientSuggestions(
    input.source,
    input.deterministic,
    parsed.ingredients,
  )

  return {
    result,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}
