import type { Recipe } from '../../domain/recipes/types'
import type { ShoppingItem, ShoppingItemInput } from '../../domain/shopping/types'

export interface ShoppingRepository {
  list(householdId: string): Promise<ShoppingItem[]>
  create(householdId: string, input: ShoppingItemInput): Promise<ShoppingItem>
  createFromPlan?(
    householdId: string,
    plannedMealId: string,
    inputs: ShoppingItemInput[],
  ): Promise<void>
  setCompletedMany?(householdId: string, itemIds: string[], completed: boolean): Promise<void>
  removeMany?(householdId: string, itemIds: string[]): Promise<void>
  updatePurchase?(
    householdId: string,
    inputs: (ShoppingItemInput & { id: string })[],
  ): Promise<void>
  refreshRecipe?(householdId: string, recipe: Recipe): Promise<void>
  update(itemId: string, input: ShoppingItemInput): Promise<ShoppingItem>
  setCompleted(itemId: string, completed: boolean): Promise<ShoppingItem>
  remove(itemId: string): Promise<void>
}
