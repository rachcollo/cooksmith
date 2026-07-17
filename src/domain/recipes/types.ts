export interface Recipe {
  id: string
  householdId: string
  name: string
  ingredients: string | null
  description: string | null
  sourceNote: string | null
  sourceUrl: string | null
  servings: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  imageUrl: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RecipeInput {
  name: string
  description: string | null
  sourceNote: string | null
  sourceUrl: string | null
  servings: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  imageUrl: string | null
}
