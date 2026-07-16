import type { PantryItem, PantryItemInput } from '../../domain/pantry/types'

export interface PantryRepository {
  list(householdId: string): Promise<PantryItem[]>
  create(householdId: string, input: PantryItemInput): Promise<PantryItem>
  update(itemId: string, input: PantryItemInput): Promise<PantryItem>
  remove(itemId: string): Promise<void>
}
