import type {
  WeeklyPreparationAdminRepository,
  WeeklyPreparationEvaluation,
  RecipeEnrichmentBackfillStatus,
  WeeklyPreparationSettings,
} from '../../application/admin/weeklyPreparationAdminRepository'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type SettingsRow = {
  ai_enabled: boolean
  emergency_stop: boolean
  model_identifier: string
  updated_at: string
}

function settingsFrom(row: SettingsRow): WeeklyPreparationSettings {
  return {
    aiEnabled: row.ai_enabled,
    emergencyStop: row.emergency_stop,
    modelIdentifier: row.model_identifier,
    updatedAt: row.updated_at,
  }
}

function backfillStatus(value: unknown): RecipeEnrichmentBackfillStatus {
  if (!value || typeof value !== 'object') throw new Error('Invalid recipe enrichment status.')
  return value as RecipeEnrichmentBackfillStatus
}

export function createSupabaseWeeklyPreparationAdminRepository(
  client: CooksmithSupabaseClient,
): WeeklyPreparationAdminRepository {
  const database = client.schema('cooksmith')
  return {
    async getSettings() {
      const { data, error } = await database
        .from('weekly_preparation_settings')
        .select('ai_enabled, emergency_stop, model_identifier, updated_at')
        .eq('singleton', true)
        .single()
      if (error) throw new Error('Cooksmith could not load weekly preparation controls.')
      return settingsFrom(data)
    },
    async updateSettings(input) {
      const { data, error } = await database
        .from('weekly_preparation_settings')
        .update({
          ai_enabled: input.aiEnabled,
          emergency_stop: input.emergencyStop,
        })
        .eq('singleton', true)
        .select('ai_enabled, emergency_stop, model_identifier, updated_at')
        .single()
      if (error) throw new Error('Cooksmith could not update weekly preparation controls.')
      return settingsFrom(data)
    },
    async getLatestEvaluation() {
      const { data, error } = await database
        .from('weekly_preparation_evaluation_runs')
        .select(
          'created_at, plan_count, deterministic_count, model_call_count, valid_output_count, fallback_count, reviewed_correct_count, unsupported_count, total_latency_ms, input_tokens, output_tokens, estimated_cost_aud, ambiguous_decision',
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error('Cooksmith could not load weekly preparation evaluation evidence.')
      if (!data) return null
      return {
        createdAt: data.created_at,
        planCount: data.plan_count,
        deterministicCount: data.deterministic_count,
        modelCallCount: data.model_call_count,
        validOutputCount: data.valid_output_count,
        fallbackCount: data.fallback_count,
        reviewedCorrectCount: data.reviewed_correct_count,
        unsupportedCount: data.unsupported_count,
        averageLatencyMs:
          data.plan_count === 0 ? 0 : Math.round(data.total_latency_ms / data.plan_count),
        inputTokens: data.input_tokens,
        outputTokens: data.output_tokens,
        estimatedCostAud: data.estimated_cost_aud,
        ambiguousDecision:
          data.ambiguous_decision as WeeklyPreparationEvaluation['ambiguousDecision'],
      }
    },
    async getRecipeEnrichmentStatus() {
      const { data, error } = await database.rpc('recipe_enrichment_backfill_status')
      if (error) throw new Error('Cooksmith could not load recipe enrichment progress.')
      return backfillStatus(data)
    },
    async commandRecipeEnrichment(command) {
      const { data, error } = await database.rpc('recipe_enrichment_backfill_command', {
        command,
        batch_limit: 25,
      })
      if (error) throw new Error('Cooksmith could not update recipe enrichment.')
      const result = data as { status?: unknown } | null
      return backfillStatus(result?.status)
    },
  }
}
