import type { PostgrestError } from '@supabase/supabase-js'

import type { RecipeRepository } from '../../application/recipes/recipeRepository'
import { deriveRecipeContent } from '../../domain/recipes/contentDerivation'
import type { Recipe, RecipeIngredient, RecipeInput, RecipeStep } from '../../domain/recipes/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type RecipeIngredientRow = {
  id: string
  ingredient_name: string
  quantity_text: string | null
  unit: string | null
  preparation: string | null
  original_line_text: string | null
  parser_version: string | null
  derivation_status: string | null
  position: number
}

type RecipeStepRow = {
  id: string
  instruction: string
  original_line_text: string | null
  parser_version: string | null
  derivation_status: string | null
  position: number
}

type RecipeRow = {
  id: string
  household_id: string
  name: string
  ingredients: string | null
  description: string | null
  source_note: string | null
  source_url: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  image_url: string | null
  notes: string | null
  category: string | null
  tags: string[] | null
  favourite: boolean | null
  recipe_ingredients?: RecipeIngredientRow[] | null
  recipe_steps?: RecipeStepRow[] | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

function mapIngredient(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    name: row.ingredient_name,
    quantity: row.quantity_text,
    unit: row.unit,
    preparation: row.preparation,
    originalLineText: row.original_line_text ?? row.ingredient_name,
    parserVersion: row.parser_version ?? 'legacy',
    derivationStatus: row.derivation_status ?? 'derived',
    position: row.position,
  }
}

function mapStep(row: RecipeStepRow): RecipeStep {
  return {
    id: row.id,
    instruction: row.instruction,
    originalLineText: row.original_line_text ?? row.instruction,
    parserVersion: row.parser_version ?? 'legacy',
    derivationStatus: row.derivation_status ?? 'derived',
    position: row.position,
  }
}

function mapRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    ingredients: row.ingredients,
    description: row.description,
    sourceNote: row.source_note,
    sourceUrl: row.source_url,
    servings: row.servings,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    imageUrl: row.image_url,
    notes: row.notes,
    category: row.category,
    tags: row.tags ?? [],
    favourite: row.favourite ?? false,
    ingredientRows: (row.recipe_ingredients ?? [])
      .map(mapIngredient)
      .sort((a, b) => a.position - b.position),
    steps: (row.recipe_steps ?? []).map(mapStep).sort((a, b) => a.position - b.position),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function replaceStructuredRows(
  database: ReturnType<CooksmithSupabaseClient['schema']>,
  recipeId: string,
  input: RecipeInput,
) {
  const recipeTables = database as never as {
    from: (table: string) => ReturnType<typeof database.from>
  }
  const ingredientDelete = await recipeTables
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId)
  recipeError(ingredientDelete.error)
  const stepDelete = await recipeTables.from('recipe_steps').delete().eq('recipe_id', recipeId)
  recipeError(stepDelete.error)

  const derivedContent = deriveRecipeContent(input.ingredients, input.description)

  if (derivedContent.ingredients.length > 0) {
    const ingredientInsert = await (
      database as never as { from: (table: string) => ReturnType<typeof database.from> }
    )
      .from('recipe_ingredients')
      .insert(
        derivedContent.ingredients.map((ingredient, index) => ({
          recipe_id: recipeId,
          ingredient_name: ingredient.name,
          quantity_text: ingredient.quantity,
          unit: ingredient.unit,
          preparation: ingredient.preparation,
          original_line_text: ingredient.originalLineText,
          parser_version: ingredient.parserVersion,
          derivation_status: ingredient.derivationStatus,
          position: index + 1,
        })) as never,
      )
    recipeError(ingredientInsert.error)
  }

  if (derivedContent.steps.length > 0) {
    const stepInsert = await (
      database as never as { from: (table: string) => ReturnType<typeof database.from> }
    )
      .from('recipe_steps')
      .insert(
        derivedContent.steps.map((step, index) => ({
          recipe_id: recipeId,
          instruction: step.instruction,
          original_line_text: step.originalLineText,
          parser_version: step.parserVersion,
          derivation_status: step.derivationStatus,
          position: index + 1,
        })) as never,
      )
    recipeError(stepInsert.error)
  }
}

function recipeError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '23505': 'That recipe name already exists in this household.',
    '23514': 'Check the recipe details and try again.',
    '42501': 'You do not have permission to change this recipe.',
    '42P01':
      'Recipe saving is not available in this preview because its database update has not been released yet.',
    PGRST205:
      'Recipe saving is not available in this preview because its database update has not been released yet.',
  }
  throw new Error(
    messages[error.code] ?? 'Cooksmith could not update the recipe library. Try again.',
  )
}

export function createSupabaseRecipeRepository(client: CooksmithSupabaseClient): RecipeRepository {
  const database = client.schema('cooksmith')
  const selection =
    'id, household_id, name, ingredients, description, source_note, source_url, servings, prep_time_minutes, cook_time_minutes, image_url, notes, category, tags, favourite, archived_at, created_at, updated_at, recipe_ingredients(id, ingredient_name, quantity_text, unit, preparation, original_line_text, parser_version, derivation_status, position), recipe_steps(id, instruction, original_line_text, parser_version, derivation_status, position)'

  return {
    async list(householdId) {
      const result = await database
        .from('household_recipes')
        .select(selection)
        .eq('household_id', householdId)
        .is('archived_at', null)
        .order('name')
      recipeError(result.error)
      return ((result.data ?? []) as unknown as RecipeRow[]).map(mapRow)
    },
    async create(householdId, input) {
      const result = await database
        .from('household_recipes')
        .insert({
          household_id: householdId,
          name: input.name,
          ingredients: input.ingredients,
          description: input.description,
          source_note: input.sourceNote,
          source_url: input.sourceUrl,
          servings: input.servings,
          prep_time_minutes: input.prepTimeMinutes,
          cook_time_minutes: input.cookTimeMinutes,
          image_url: input.imageUrl,
          notes: input.notes,
          category: input.category,
          tags: input.tags,
          favourite: input.favourite,
        } as never)
        .select(selection)
        .single()
      recipeError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save the recipe.')
      await replaceStructuredRows(database, (result.data as unknown as RecipeRow).id, input)
      const refreshed = await database
        .from('household_recipes')
        .select(selection)
        .eq('id', (result.data as unknown as RecipeRow).id)
        .single()
      recipeError(refreshed.error)
      if (!refreshed.data) throw new Error('Cooksmith could not save the recipe.')
      return mapRow(refreshed.data as unknown as RecipeRow)
    },
    async update(householdId, recipeId, input) {
      const result = await database
        .from('household_recipes')
        .update({
          name: input.name,
          ingredients: input.ingredients,
          description: input.description,
          source_note: input.sourceNote,
          source_url: input.sourceUrl,
          servings: input.servings,
          prep_time_minutes: input.prepTimeMinutes,
          cook_time_minutes: input.cookTimeMinutes,
          image_url: input.imageUrl,
          notes: input.notes,
          category: input.category,
          tags: input.tags,
          favourite: input.favourite,
        } as never)
        .eq('id', recipeId)
        .eq('household_id', householdId)
        .select(selection)
        .single()
      recipeError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update the recipe.')
      await replaceStructuredRows(database, recipeId, input)
      const refreshed = await database
        .from('household_recipes')
        .select(selection)
        .eq('id', recipeId)
        .single()
      recipeError(refreshed.error)
      if (!refreshed.data) throw new Error('Cooksmith could not update the recipe.')
      return mapRow(refreshed.data as unknown as RecipeRow)
    },
    async archive(householdId, recipeId) {
      const result = await database
        .from('household_recipes')
        .update({ archived_at: new Date().toISOString() } as never)
        .eq('id', recipeId)
        .eq('household_id', householdId)
        .select(selection)
        .single()
      recipeError(result.error)
      if (!result.data) throw new Error('Cooksmith could not archive the recipe.')
      return mapRow(result.data as unknown as RecipeRow)
    },
  }
}
