import type { WeeklyPreparationPlan } from '../../domain/get-ahead/weeklyPreparationPlan'

export interface WeeklyPreparationRepository {
  getCurrentPlan(input: { weekStart: string; weekEnd: string }): Promise<WeeklyPreparationPlan>
}
