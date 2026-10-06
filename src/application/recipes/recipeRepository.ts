import type {
  ImportedRecipeVisibility,
  Recipe,
  RecipeImportDraft,
  RecipeInput,
} from '../../domain/recipes/types'

export interface RecipeRepository {
  list(householdId: string): Promise<Recipe[]>
  setFavourite?(
    householdId: string,
    recipeId: string,
    source: 'household' | 'imported',
    desired: boolean,
  ): Promise<boolean>
  create(householdId: string, input: RecipeInput): Promise<Recipe>
  createImported?(input: RecipeInput, visibility: ImportedRecipeVisibility): Promise<Recipe>
  importFromUrl?(url: string): Promise<RecipeImportDraft>
  update(householdId: string, recipeId: string, input: RecipeInput): Promise<Recipe>
  archive(householdId: string, recipeId: string): Promise<Recipe>
}
