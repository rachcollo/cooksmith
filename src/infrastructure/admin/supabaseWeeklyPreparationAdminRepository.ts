import type {
  WeeklyPreparationAdminRepository,
  WeeklyPreparationEvaluation,
  RecipeEnrichmentBackfillStatus,
  AdminRecipeEnrichment,
  WeeklyPreparationSettings,
} from '../../application/admin/weeklyPreparationAdminRepository'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type SettingsRow = {
  ai_enabled: boolean
  emergency_stop: boolean
  model_identifier: string
  corpus_version: string
  prompt_version: string
  smoke_verified_at: string | null
  updated_at: string
}

function settingsFrom(row: SettingsRow): WeeklyPreparationSettings {
  return {
    aiEnabled: row.ai_enabled,
    emergencyStop: row.emergency_stop,
    modelIdentifier: row.model_identifier,
    corpusVersion: row.corpus_version,
    promptVersion: row.prompt_version,
    smokeVerified: Boolean(row.smoke_verified_at),
    updatedAt: row.updated_at,
  }
}

function backfillStatus(value: unknown): RecipeEnrichmentBackfillStatus {
  if (!value || typeof value !== 'object') throw new Error('Invalid recipe enrichment status.')
  return value as RecipeEnrichmentBackfillStatus
}

async function evaluationErrorMessage(error: unknown): Promise<string> {
  const context =
    error && typeof error === 'object' && 'context' in error ? error.context : undefined
  if (!(context instanceof Response))
    return 'The 30-plan evaluation could not be started. Check the Edge Function release.'

  const payload = (await context
    .clone()
    .json()
    .catch(() => null)) as { error?: unknown } | null
  switch (payload?.error) {
    case 'configuration_incomplete':
      return 'The 30-plan evaluation is missing provider or release configuration.'
    case 'evaluation_persistence_unavailable':
      return 'The 30-plan evaluation could not access Cooksmith evaluation storage.'
    case 'administrator_required':
      return 'Your administrator access could not be verified.'
    default:
      return 'The 30-plan evaluation could not complete. Check the Edge Function logs.'
  }
}

export function createSupabaseWeeklyPreparationAdminRepository(
  client: CooksmithSupabaseClient,
): WeeklyPreparationAdminRepository {
  const database = client.schema('cooksmith')
  return {
    async getSettings() {
      const { data, error } = await database
        .from('weekly_preparation_settings')
        .select(
          'ai_enabled, emergency_stop, model_identifier, corpus_version, prompt_version, smoke_verified_at, updated_at',
        )
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
        .select(
          'ai_enabled, emergency_stop, model_identifier, corpus_version, prompt_version, smoke_verified_at, updated_at',
        )
        .single()
      if (error) throw new Error('Cooksmith could not update weekly preparation controls.')
      return settingsFrom(data)
    },
    async getLatestEvaluation() {
      const { data, error } = await database
        .from('weekly_preparation_evaluation_runs')
        .select(
          'id, status, created_at, plan_count, deterministic_count, model_call_count, valid_output_count, fallback_count, reviewed_correct_count, unsupported_count, total_latency_ms, input_tokens, output_tokens, estimated_cost_aud, ambiguous_decision, weekly_preparation_evaluation_acceptances(id)',
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error('Cooksmith could not load weekly preparation evaluation evidence.')
      if (!data) return null
      return {
        id: data.id,
        status: data.status as WeeklyPreparationEvaluation['status'],
        accepted: Boolean(data.weekly_preparation_evaluation_acceptances),
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
    async runEvaluation() {
      const { error } = await client.functions.invoke('evaluate-weekly-preparation', {
        body: { command: 'run' },
      })
      if (error) throw new Error(await evaluationErrorMessage(error))
    },
    async acceptEvaluation(runId) {
      const { error } = await database.rpc('accept_weekly_preparation_evaluation', {
        target_run_id: runId,
      })
      if (error) throw new Error('This evaluation is not ready to accept.')
    },
    async getRecipeEnrichmentStatus() {
      const { data, error } = await database.rpc('recipe_enrichment_backfill_status')
      if (error) throw new Error('Cooksmith could not load recipe enrichment progress.')
      return backfillStatus(data)
    },
    async commandRecipeEnrichment(command) {
      const { data, error } = await database.rpc('recipe_enrichment_backfill_command', {
        command,
        batch_limit: command === 'retry_failed' ? 1 : 100,
      })
      if (error) throw new Error('Cooksmith could not update recipe enrichment.')
      if (command !== 'pause') {
        const { error: dispatchError } = await client.functions.invoke('enrich-recipe', {
          body:
            command === 'retry_failed'
              ? { dispatchMode: 'single', modelKey: 'provider-assisted-v1' }
              : {},
        })
        if (dispatchError) throw new Error('Cooksmith could not start recipe enrichment.')
      }
      const result = data as { status?: unknown } | null
      if (!result?.status) throw new Error('Cooksmith did not return recipe enrichment progress.')
      return this.getRecipeEnrichmentStatus()
    },
    async setRecipeIntelligenceAi(enabled) {
      const { data, error } = await database.rpc('recipe_intelligence_ai_command', {
        command: enabled ? 'enable_ai' : 'disable_ai',
      })
      if (error) throw new Error('Cooksmith could not update Recipe Intelligence AI.')
      return backfillStatus(data)
    },
    async listRecipeEnrichments(input = {}) {
      const { data, error } = await database.rpc('admin_recipe_enrichment_list', {
        search_text: input.query?.trim() || undefined,
        status_filter: input.status === 'all' ? undefined : input.status,
      })
      if (error) throw new Error('Cooksmith could not load recipe insight statuses.')
      return (data ?? []).map((row) => {
        const item = row as Record<string, unknown>
        return {
          recipeId: String(item.recipe_id),
          sourceKind: item.source_kind as AdminRecipeEnrichment['sourceKind'],
          name: String(item.name),
          ownerLabel: String(item.owner_label),
          updatedAt: String(item.updated_at),
          status: item.status as AdminRecipeEnrichment['status'],
          completedAt: item.completed_at ? String(item.completed_at) : null,
          aiActive: Boolean(item.ai_active),
          retryable: Boolean(item.retryable),
          canEdit: Boolean(item.can_edit),
        }
      })
    },
    async retryRecipeEnrichment(recipeId, sourceKind) {
      const { error } = await database.rpc('admin_retry_recipe_enrichment', {
        target_recipe_id: recipeId,
        target_source_kind: sourceKind,
      })
      if (error) throw new Error('Cooksmith could not retry recipe insights.')
      const { error: dispatchError } = await client.functions.invoke('enrich-recipe', { body: {} })
      if (dispatchError) throw new Error('Recipe insights are queued and will start shortly.')
    },
  }
}
