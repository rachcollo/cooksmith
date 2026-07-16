import type { PostgrestError } from '@supabase/supabase-js'

import type { PantryRepository } from '../../application/pantry/pantryRepository'
import type { PantryItem } from '../../domain/pantry/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type PantryRow = {
  id: string
  household_id: string
  name: string
  category: PantryItem['category']
  quantity: number | string | null
  unit: string | null
  available: boolean
  is_default: boolean
  updated_at: string
}

function mapRow(row: PantryRow): PantryItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    available: row.available,
    isDefault: row.is_default,
    updatedAt: row.updated_at,
  }
}

function pantryError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '23505': 'That pantry item already exists for this household.',
    '23514': 'Check the item name, unit and quantity.',
    '42501': 'You do not have permission to change this pantry.',
  }
  throw new Error(messages[error.code] ?? 'Cooksmith could not update the pantry. Try again.')
}

export function createSupabasePantryRepository(client: CooksmithSupabaseClient): PantryRepository {
  const database = client.schema('cooksmith')
  const selection =
    'id, household_id, name, category, quantity, unit, available, is_default, updated_at'

  return {
    async list(householdId) {
      const result = await database
        .from('household_pantry_items')
        .select(selection)
        .eq('household_id', householdId)
        .order('category')
        .order('name')
      pantryError(result.error)
      return ((result.data ?? []) as PantryRow[]).map(mapRow)
    },

    async create(householdId, input) {
      const result = await database
        .from('household_pantry_items')
        .insert({
          household_id: householdId,
          name: input.name,
          category: input.category,
          quantity: input.quantity,
          unit: input.unit,
          available: input.available,
        })
        .select(selection)
        .single()
      pantryError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save the pantry item.')
      return mapRow(result.data as PantryRow)
    },

    async update(itemId, input) {
      const result = await database
        .from('household_pantry_items')
        .update({
          name: input.name,
          category: input.category,
          quantity: input.quantity,
          unit: input.unit,
          available: input.available,
        })
        .eq('id', itemId)
        .select(selection)
        .single()
      pantryError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update the pantry item.')
      return mapRow(result.data as PantryRow)
    },

    async remove(itemId) {
      const result = await database.from('household_pantry_items').delete().eq('id', itemId)
      pantryError(result.error)
    },
  }
}
