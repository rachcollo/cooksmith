import type {
  RecipeIntelligence,
  RecipeIntelligenceSource,
} from '../../../src/domain/recipes/intelligence.ts'

type LinkSuggestion = {
  sourceIngredientId: string
  sourceStepIds: string[]
  confidence: 'high' | 'medium' | 'low' | 'unknown'
}

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

export async function resolveAmbiguousLinks(input: {
  apiKey: string
  model: string
  source: RecipeIntelligenceSource
  deterministic: RecipeIntelligence
  timeoutMs: number
}) {
  const unresolved = new Set(input.deterministic.unresolvedIngredientIds)
  if (unresolved.size === 0)
    return { result: input.deterministic, inputTokens: 0, outputTokens: 0 }

  const ingredientIds = [...unresolved]
  const stepIds = input.source.steps.map((step) => step.id)
  const payload = {
    model: input.model,
    input: [
      {
        role: 'system',
        content:
          'Link only the supplied ingredient IDs to supplied step IDs. Do not add ingredients, steps, quantities, food-safety advice or other facts.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          ingredients: input.source.ingredients
            .filter((ingredient) => unresolved.has(ingredient.id))
            .map(({ id, originalText }) => ({ id, originalText })),
          steps: input.source.steps,
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'recipe_ingredient_step_links',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['links'],
          properties: {
            links: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['sourceIngredientId', 'sourceStepIds', 'confidence'],
                properties: {
                  sourceIngredientId: { type: 'string', enum: ingredientIds },
                  sourceStepIds: {
                    type: 'array',
                    uniqueItems: true,
                    items: { type: 'string', enum: stepIds },
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low', 'unknown'],
                  },
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
    const category = response.status === 429 || response.status >= 500 ? 'transient_provider' : 'permanent_provider'
    throw new Error(category)
  }

  const body = (await response.json()) as OpenAIResponse
  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('schema_invalid')
  const parsed = JSON.parse(text) as { links?: LinkSuggestion[] }
  if (!Array.isArray(parsed.links)) throw new Error('schema_invalid')

  const result: RecipeIntelligence = {
    ...input.deterministic,
    ingredients: input.deterministic.ingredients.map((ingredient) => {
      const link = parsed.links?.find(
        (candidate) => candidate.sourceIngredientId === ingredient.sourceIngredientId,
      )
      if (!link) return ingredient
      if (
        !unresolved.has(link.sourceIngredientId) ||
        link.sourceStepIds.some((id) => !stepIds.includes(id))
      )
        throw new Error('unsupported_data')
      return {
        ...ingredient,
        sourceStepIds: link.sourceStepIds,
        confidence: link.confidence,
        provenance: 'model',
      }
    }),
    unresolvedIngredientIds: input.deterministic.unresolvedIngredientIds.filter(
      (id) => !parsed.links?.some((link) => link.sourceIngredientId === id && link.sourceStepIds.length),
    ),
  }

  return {
    result,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}
