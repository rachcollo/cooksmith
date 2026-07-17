export interface RecipeIngredient {
  id: string
  name: string
  quantity: string | null
  unit: string | null
  preparation: string | null
  position: number
}

export interface RecipeStep {
  id: string
  instruction: string
  position: number
}

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
  notes: string | null
  category: string | null
  tags: string[]
  favourite: boolean
  ingredientRows: RecipeIngredient[]
  steps: RecipeStep[]
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RecipeIngredientInput {
  name: string
  quantity: string | null
  unit: string | null
  preparation: string | null
}

export interface RecipeStepInput {
  instruction: string
}

export interface RecipeInput {
  name: string
  ingredients: string | null
  description: string | null
  sourceNote: string | null
  sourceUrl: string | null
  servings: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  imageUrl: string | null
  notes: string | null
  category: string | null
  tags: string[]
  favourite: boolean
  ingredientRows: RecipeIngredientInput[]
  steps: RecipeStepInput[]
}
