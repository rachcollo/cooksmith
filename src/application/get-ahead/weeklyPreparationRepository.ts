import type { WeeklyPreparationPlan } from '../../domain/get-ahead/weeklyPreparationPlan'

export interface WeeklyPreparationRepository {
  getCurrentPlan(input: {
    householdId: string
    weekStart: string
    weekEnd: string
    availableMinutes: number
    forceRetry?: boolean
  }): Promise<WeeklyPreparationPlan>
}

export type WeeklyPreparationUnavailableReason =
  | 'no_planned_meals'
  | 'recipes_preparing'
  | 'recipes_without_opportunities'
  | 'opportunities_not_ready_yet'
  | 'ai_unavailable'
  | 'temporarily_unavailable'

export class WeeklyPreparationUnavailableError extends Error {
  constructor(readonly reason: WeeklyPreparationUnavailableReason) {
    super(reason)
    this.name = 'WeeklyPreparationUnavailableError'
  }
}
