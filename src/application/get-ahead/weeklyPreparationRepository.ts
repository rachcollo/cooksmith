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
