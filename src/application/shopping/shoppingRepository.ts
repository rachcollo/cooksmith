import type { ShoppingItem, ShoppingItemInput } from '../../domain/shopping/types'

export interface ShoppingRepository {
  list(householdId: string): Promise<ShoppingItem[]>
  create(householdId: string, input: ShoppingItemInput): Promise<ShoppingItem>
  createFromPlan(householdId: string, inputs: ShoppingItemInput[]): Promise<ShoppingItem[]>
  update(itemId: string, input: ShoppingItemInput): Promise<ShoppingItem>
  setCompleted(itemId: string, completed: boolean): Promise<ShoppingItem>
  remove(itemId: string): Promise<void>
}
