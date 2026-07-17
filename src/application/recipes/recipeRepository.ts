import type { Recipe, RecipeInput } from '../../domain/recipes/types'

export interface RecipeRepository {
  list(householdId: string): Promise<Recipe[]>
  create(householdId: string, input: RecipeInput): Promise<Recipe>
  update(householdId: string, recipeId: string, input: RecipeInput): Promise<Recipe>
  archive(householdId: string, recipeId: string): Promise<Recipe>
}
