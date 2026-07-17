import type { PostgrestError } from '@supabase/supabase-js'

import type { RecipeRepository } from '../../application/recipes/recipeRepository'
import type { Recipe } from '../../domain/recipes/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type RecipeRow = {
  id: string
  household_id: string
  name: string
  description: string | null
  source_note: string | null
  source_url: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  image_url: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    description: row.description,
    sourceNote: row.source_note,
    sourceUrl: row.source_url,
    servings: row.servings,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    imageUrl: row.image_url,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function recipeError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '23505': 'That recipe name already exists in this household.',
    '23514': 'Check the recipe details and try again.',
    '42501': 'You do not have permission to change this recipe.',
  }
  throw new Error(
    messages[error.code] ?? 'Cooksmith could not update the recipe library. Try again.',
  )
}

export function createSupabaseRecipeRepository(client: CooksmithSupabaseClient): RecipeRepository {
  const database = client.schema('cooksmith')
  const selection =
    'id, household_id, name, description, source_note, source_url, servings, prep_time_minutes, cook_time_minutes, image_url, archived_at, created_at, updated_at'

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
          description: input.description,
          source_note: input.sourceNote,
          source_url: input.sourceUrl,
          servings: input.servings,
          prep_time_minutes: input.prepTimeMinutes,
          cook_time_minutes: input.cookTimeMinutes,
          image_url: input.imageUrl,
        } as never)
        .select(selection)
        .single()
      recipeError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save the recipe.')
      return mapRow(result.data as unknown as RecipeRow)
    },
    async update(householdId, recipeId, input) {
      const result = await database
        .from('household_recipes')
        .update({
          name: input.name,
          description: input.description,
          source_note: input.sourceNote,
          source_url: input.sourceUrl,
          servings: input.servings,
          prep_time_minutes: input.prepTimeMinutes,
          cook_time_minutes: input.cookTimeMinutes,
          image_url: input.imageUrl,
        } as never)
        .eq('id', recipeId)
        .eq('household_id', householdId)
        .select(selection)
        .single()
      recipeError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update the recipe.')
      return mapRow(result.data as unknown as RecipeRow)
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
