export interface FreezerMealInput {
  name: string
  portions: number
  frozenOn: string
  useFirstOn: string | null
  notes: string | null
  householdRecipeId: string | null
  importedRecipeId: string | null
}
export interface FreezerMeal extends FreezerMealInput {
  id: string
  householdId: string
  reserved: number
  available: number
  archivedAt: string | null
  revision: number
}
export interface FreezerCommand {
  operationId: string
  action: 'create' | 'edit' | 'archive' | 'restore' | 'reserve' | 'consume' | 'undo'
  freezerId: string
  planId?: string | null
  payload: { [key: string]: string | number | null }
}
