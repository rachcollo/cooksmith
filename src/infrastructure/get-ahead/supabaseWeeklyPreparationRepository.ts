import type { WeeklyPreparationRepository } from '../../application/get-ahead/weeklyPreparationRepository'
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
      if (error || !isPlan(data?.plan))
        throw new Error('Cooksmith could not load consolidated preparation guidance.')
      return data.plan
    },
  }
}
