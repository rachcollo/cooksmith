import {
  WeeklyPreparationUnavailableError,
  type WeeklyPreparationRepository,
  type WeeklyPreparationUnavailableReason,
} from '../../application/get-ahead/weeklyPreparationRepository'
import {
  weeklyPreparationPlannerVersion,
  weeklyPreparationPlanSchemaVersion,
  type WeeklyPreparationPlan,
} from '../../domain/get-ahead/weeklyPreparationPlan'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

function isPlan(value: unknown): value is WeeklyPreparationPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<WeeklyPreparationPlan>
  return (
    plan.schemaVersion === weeklyPreparationPlanSchemaVersion &&
    plan.plannerVersion === weeklyPreparationPlannerVersion &&
    typeof plan.householdId === 'string' &&
    typeof plan.planId === 'string' &&
    typeof plan.cacheKey === 'string' &&
    Array.isArray(plan.tasks) &&
    (plan.generation === 'deterministic' ||
      plan.generation === 'model-assisted' ||
      plan.generation === 'fallback')
  )
}

export function createSupabaseWeeklyPreparationRepository(
  client: CooksmithSupabaseClient,
): WeeklyPreparationRepository {
  return {
    async getCurrentPlan(input) {
      const { data, error } = await client.functions.invoke('get-weekly-preparation-plan', {
        body: input,
      })
      if (error) {
        const context = error.context
        let reason: WeeklyPreparationUnavailableReason = 'temporarily_unavailable'
        if (context instanceof Response) {
          const payload = (await context
            .clone()
            .json()
            .catch(() => null)) as {
            error?: unknown
          } | null
          if (payload?.error === 'recipes_preparing') reason = 'recipes_preparing'
          else if (payload?.error === 'no_planned_meals') reason = 'no_planned_meals'
          else if (payload?.error === 'recipes_without_opportunities')
            reason = 'recipes_without_opportunities'
          else if (payload?.error === 'opportunities_not_ready_yet')
            reason = 'opportunities_not_ready_yet'
          else if (payload?.error === 'ai_unavailable') reason = 'ai_unavailable'
        }
        throw new WeeklyPreparationUnavailableError(reason)
      }
      if (!isPlan(data?.plan))
        throw new WeeklyPreparationUnavailableError('temporarily_unavailable')
      return data.plan
    },
  }
}
