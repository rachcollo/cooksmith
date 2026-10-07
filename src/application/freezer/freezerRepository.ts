import type { FreezerCommand, FreezerMeal } from '../../domain/freezer/types'
export interface FreezerRepository {
  list(householdId: string): Promise<FreezerMeal[]>
  command(householdId: string, command: FreezerCommand): Promise<void>
}
