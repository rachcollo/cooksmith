import type { ShoppingItem, ShoppingItemInput } from '../../domain/shopping/types'

export interface ShoppingRepository {
  list(householdId: string): Promise<ShoppingItem[]>
  create(householdId: string, input: ShoppingItemInput): Promise<ShoppingItem>
  createFromPlan?(
    householdId: string,
    plannedMealId: string,
    inputs: ShoppingItemInput[],
  ): Promise<void>
  update(itemId: string, input: ShoppingItemInput): Promise<ShoppingItem>
  setCompleted(itemId: string, completed: boolean): Promise<ShoppingItem>
  remove(itemId: string): Promise<void>
}
