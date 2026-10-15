// Server-only Responses API contract. Changing these options requires a new
// profile identity and fresh hosted acceptance, not reuse of an old model score.
export const supportedFoodIntelligenceModel = 'gpt-6-luna'
export const weeklyLunaPromptVersion = 'weekly-preparation-strategy-v13-luna-low-v2'

export function responsesOptions(model: string, operation: 'enrichment' | 'weekly') {
  if (model !== supportedFoodIntelligenceModel) return {}
  return {
    reasoning: { effort: 'low' },
    max_output_tokens: operation === 'enrichment' ? 16_384 : 8_192,
    store: false,
  }
}

export function isWeeklyModelProfileConfigured(model: string, promptVersion: string) {
  return model !== supportedFoodIntelligenceModel || promptVersion === weeklyLunaPromptVersion
}

export type OpenAIResponse = {
  status?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

export function completedOutputText(body: OpenAIResponse) {
  // A token-limited response can contain parseable partial JSON. Never activate it.
  if (body.status !== 'completed' || !Array.isArray(body.output)) throw new Error('schema_invalid')
  const content = body.output.flatMap((item) => item.content ?? [])
  const texts = content.filter((item) => item.type === 'output_text')
  if (content.some((item) => item.type === 'refusal') || texts.length !== 1)
    throw new Error('schema_invalid')
  const text = texts[0]?.text
  if (typeof text !== 'string' || !text.trim()) throw new Error('schema_invalid')
  return text
}
