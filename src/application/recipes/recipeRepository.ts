import type { Recipe, RecipeInput } from '../../domain/recipes/types'

export interface RecipeRepository {
  list(householdId: string): Promise<Recipe[]>
  create(householdId: string, input: RecipeInput): Promise<Recipe>
  update(recipeId: string, input: RecipeInput): Promise<Recipe>
  archive(recipeId: string): Promise<Recipe>
}
