import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  completedOutputText,
  isWeeklyModelProfileConfigured,
  responsesOptions,
  supportedFoodIntelligenceModel,
  weeklyLunaPromptVersion,
} from '../../supabase/functions/_shared/openaiProfile'
import { resolveAmbiguousLinks } from '../../supabase/functions/enrich-recipe/openaiAdapter'
import { decideAmbiguousPreparation } from '../../supabase/functions/generate-weekly-preparation-plan/openaiAdapter'
import { buildDeterministicRecipeIntelligence } from '../../src/domain/recipes/intelligence'
import { buildWeeklyPreparationEvaluationCorpus } from '../../src/domain/get-ahead/weeklyPreparationEvaluationCorpus'

const source = {
  recipeId: 'synthetic-recipe',
  recipeFingerprint: 'synthetic-version',
  ingredients: [
    {
      id: 'i1',
      name: 'onion',
      originalText: '1 onion',
      quantityText: '1',
      unit: null,
      preparation: null,
    },
  ],
  steps: [],
}
const ingredients = [
  {
    sourceIngredientId: 'i1',
    canonicalName: 'onion',
    aliases: [],
    modifiers: [],
    quantity: {
      state: 'known',
      original: '1',
      normalisedValue: 1,
      normalisedMaximum: 1,
      unit: null,
      dimension: 'count',
    },
    action: null,
    preparationDetail: null,
    sourceStepIds: [],
    confidence: 'high',
  },
]
const candidate = buildWeeklyPreparationEvaluationCorpus()[0]!
const invoke = {
  enrichment: (model = supportedFoodIntelligenceModel) =>
    resolveAmbiguousLinks({
      apiKey: 'synthetic-key',
      model,
      source,
      deterministic: buildDeterministicRecipeIntelligence(source),
      timeoutMs: 1000,
    }),
  weekly: (model = supportedFoodIntelligenceModel) =>
    decideAmbiguousPreparation({
      apiKey: 'synthetic-key',
      model,
      candidates: candidate.candidates,
      meals: candidate.meals,
      timeoutMs: 1000,
    }),
}
function completed(value: unknown) {
  return {
    status: 'completed',
    output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
    usage: { input_tokens: 120, output_tokens: 80 },
  }
}
afterEach(() => vi.unstubAllGlobals())

describe('shared supported model contract', () => {
  it('uses the proposed profile only for Luna and keeps rollback requests compatible', () => {
    expect(responsesOptions('gpt-6-luna', 'enrichment')).toEqual({
      reasoning: { effort: 'low' },
      max_output_tokens: 16384,
      store: false,
    })
    expect(responsesOptions('gpt-6-luna', 'weekly').max_output_tokens).toBe(8192)
    expect(responsesOptions('gpt-4.1-mini', 'weekly')).toEqual({})
    expect(isWeeklyModelProfileConfigured('gpt-6-luna', 'weekly-preparation-strategy-v13')).toBe(
      false,
    )
    expect(
      isWeeklyModelProfileConfigured('gpt-6-luna', 'weekly-preparation-strategy-v13-luna-low-v1'),
    ).toBe(false)
    expect(weeklyLunaPromptVersion).toBe('weekly-preparation-strategy-v13-luna-low-v2')
    expect(isWeeklyModelProfileConfigured('gpt-6-luna', weeklyLunaPromptVersion)).toBe(true)
    expect(isWeeklyModelProfileConfigured('gpt-4.1-mini', 'weekly-preparation-strategy-v13')).toBe(
      true,
    )
  })

  for (const operation of ['enrichment', 'weekly'] as const) {
    it(`${operation} sends strict Responses JSON with bounded reasoning and preserves usage`, async () => {
      const data =
        operation === 'enrichment' ? { ingredients, preparationOpportunities: [] } : { tasks: [] }
      const fetchMock = vi.fn().mockResolvedValue(Response.json(completed(data)))
      vi.stubGlobal('fetch', fetchMock)
      const result = await invoke[operation]()
      const [url, request] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.openai.com/v1/responses')
      const payload = JSON.parse(request.body)
      expect(payload).toMatchObject({
        model: 'gpt-6-luna',
        reasoning: { effort: 'low' },
        store: false,
        text: { format: { type: 'json_schema', strict: true } },
      })
      expect(payload.max_output_tokens).toBe(operation === 'enrichment' ? 16384 : 8192)
      for (const forbidden of ['temperature', 'top_p', 'max_tokens', 'max_completion_tokens'])
        expect(payload).not.toHaveProperty(forbidden)
      expect(result).toMatchObject({ inputTokens: 120, outputTokens: 80 })
      if ('result' in result) expect(result.result.ingredients[0]?.originalText).toBe('1 onion')
    })

    for (const [label, body] of [
      [
        'incomplete but parseable output',
        {
          ...completed({ ingredients, preparationOpportunities: [], tasks: [] }),
          status: 'incomplete',
        },
      ],
      ['refusal', { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }],
      [
        'malformed JSON',
        { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{' }] }] },
      ],
      [
        'missing completion status',
        { output: [{ content: [{ type: 'output_text', text: '{}' }] }] },
      ],
    ]) {
      it(`${operation} rejects ${label}`, async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
        await expect(invoke[operation]()).rejects.toThrow('schema_invalid')
      })
    }
    it(`${operation} does not leak provider error messages or retry rejected credentials`, async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: 'invalid_api_key', message: 'private provider diagnostic' } },
            { status: 401 },
          ),
        )
      vi.stubGlobal('fetch', fetchMock)
      await expect(invoke[operation]()).rejects.not.toThrow('private provider diagnostic')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  }
  it('rejects multiple output texts or a refusal alongside output', () => {
    expect(() =>
      completedOutputText({
        status: 'completed',
        output: [
          {
            content: [
              { type: 'output_text', text: '{}' },
              { type: 'output_text', text: '{}' },
            ],
          },
        ],
      }),
    ).toThrow('schema_invalid')
    expect(() =>
      completedOutputText({
        status: 'completed',
        output: [{ content: [{ type: 'output_text', text: '{}' }, { type: 'refusal' }] }],
      }),
    ).toThrow('schema_invalid')
  })
  it('keeps the deterministic empty-input fast path free of provider calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await decideAmbiguousPreparation({
      apiKey: '',
      model: 'gpt-6-luna',
      candidates: [],
      timeoutMs: 1000,
    })
    const empty = { ...source, ingredients: [] }
    await resolveAmbiguousLinks({
      apiKey: '',
      model: 'gpt-6-luna',
      source: empty,
      deterministic: buildDeterministicRecipeIntelligence(empty),
      timeoutMs: 1000,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
