import {
  isWeeklyPreparationCandidateEligible,
  weeklyPreparationQualityRules,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'
import type {
  WeeklyPreparationCandidate,
  WeeklyPreparationModelDecision,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

type OpenAIErrorResponse = {
  error?: { code?: unknown; type?: unknown; param?: unknown }
}

export class WeeklyPreparationProviderError extends Error {
  constructor(
    readonly category: 'provider_rate_limited' | 'provider_unavailable' | 'provider_rejected',
    readonly status: number,
    readonly providerCode: string,
    readonly providerParam: string | null,
    readonly requestId: string | null,
  ) {
    super(category)
    this.name = 'WeeklyPreparationProviderError'
  }
}

export async function decideAmbiguousPreparation(input: {
  apiKey: string
  model: string
  candidates: WeeklyPreparationCandidate[]
  meals?: Array<{
    plannedMealId: string
    mealDate: string
    recipeName: string
    ingredients: string[]
    instructions: string[]
  }>
  availableMinutes?: number
  timeoutMs: number
}) {
  const eligibleCandidates = input.candidates.filter(isWeeklyPreparationCandidateEligible)
  const eligibleIds = eligibleCandidates.map((candidate) => candidate.id)
  if (eligibleIds.length === 0)
    return {
      decision: { tasks: [] },
      inputTokens: 0,
      outputTokens: 0,
    }
  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        input: [
          {
            role: 'system',
            content:
              [
                'You are Cooksmith’s make-ahead planning brain. Build one realistic, ordered session across all selected meals.',
                'Use only eligibleCandidateIds. Never include a candidate marked unsafe or ineligible, and never repeat an ID.',
                'Every task must take at least 5 whole minutes. The total estimatedMinutes must not exceed availableMinutes.',
                'Prefer shared prep and the highest genuine midweek time saving. Fill the available time only with worthwhile work; never add filler.',
                'Task titles must be plain actions without brackets, preheating, serving instructions, reserving water or full cooking steps.',
                'Return an empty task list when eligibleCandidateIds is empty or no worthwhile prep exists.',
                `Protected rule version: ${weeklyPreparationQualityRules.version}.`,
              ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              availableMinutes: input.availableMinutes ?? 240,
              meals: input.meals ?? [],
              eligibleCandidateIds: eligibleIds,
              candidates: eligibleCandidates,
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'weekly_preparation_strategy',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['tasks'],
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                      'candidateIds',
                      'title',
                      'estimatedMinutes',
                      'estimatedTimeSavedMinutes',
                    ],
                    properties: {
                      candidateIds: {
                        type: 'array',
                        items: { type: 'string', enum: eligibleIds },
                      },
                      title: { type: 'string' },
                      estimatedMinutes: { type: 'integer' },
                      estimatedTimeSavedMinutes: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
    })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))
      throw new WeeklyPreparationProviderError('provider_unavailable', 0, 'timeout', null, null)
    throw error
  }
  if (!response.ok) {
    const category =
      response.status === 429
        ? 'provider_rate_limited'
        : response.status >= 500
          ? 'provider_unavailable'
          : 'provider_rejected'
    const rawRequestId = response.headers.get('x-request-id') ?? ''
    const requestId = /^[a-z0-9_-]{1,100}$/i.test(rawRequestId) ? rawRequestId : null
    let providerCode = 'unknown'
    let providerParam: string | null = null
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
      if (/^[a-z0-9_.-]{1,160}$/i.test(rawParam)) providerParam = rawParam
    } catch {
      // Status and category are sufficient when the provider body is unavailable.
    }
    throw new WeeklyPreparationProviderError(
      category,
      response.status,
      providerCode,
      providerParam,
      requestId,
    )
  }
  const body = (await response.json()) as OpenAIResponse
  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('schema_invalid')
  let decision: WeeklyPreparationModelDecision
  try {
    decision = JSON.parse(text) as WeeklyPreparationModelDecision
  } catch {
    throw new Error('schema_invalid')
  }
  return {
    decision,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}
