import type {
  WeeklyPreparationCandidate,
  WeeklyPreparationModelDecision,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

export async function decideAmbiguousPreparation(input: {
  apiKey: string
  model: string
  candidates: WeeklyPreparationCandidate[]
  timeoutMs: number
}) {
  const ids = input.candidates.map((candidate) => candidate.id)
  const response = await fetch('https://api.openai.com/v1/responses', {
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
            'Group only the supplied preparation candidate IDs. Preserve cut, timing, storage, allergen, component and raw-protein boundaries. Never invent or alter source data.',
        },
        { role: 'user', content: JSON.stringify(input.candidates) },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'weekly_preparation_decisions',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['groups'],
            properties: {
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['candidateIds', 'decision'],
                  properties: {
                    candidateIds: {
                      type: 'array',
                      minItems: 1,
                      uniqueItems: true,
                      items: { type: 'string', enum: ids },
                    },
                    decision: { type: 'string', enum: ['combined', 'grouped', 'separate'] },
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
  if (!response.ok) throw new Error(response.status === 429 ? 'usage_limit' : 'provider_failure')
  const body = (await response.json()) as OpenAIResponse
  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('schema_invalid')
  return {
    decision: JSON.parse(text) as WeeklyPreparationModelDecision,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}
