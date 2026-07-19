import type { PostgrestError } from '@supabase/supabase-js'

import type { ShoppingRepository } from '../../application/shopping/shoppingRepository'
import type { ShoppingItem } from '../../domain/shopping/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type ShoppingRow = {
  id: string
  household_id: string
  display_name: string
  quantity: number | string | null
  unit: string | null
  category: ShoppingItem['category']
  completed: boolean
  position: number
  updated_at: string
}

function mapRow(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.display_name,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    category: row.category,
    completed: row.completed,
    position: row.position,
    updatedAt: row.updated_at,
  }
}

function shoppingError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '23505': 'That item is already on your shopping list.',
    '23514': 'Check the item name, quantity and unit.',
    '42501': 'You do not have permission to change this shopping list.',
  }
  throw new Error(
    messages[error.code] ?? 'Cooksmith could not update the shopping list. Try again.',
  )
}

export function createSupabaseShoppingRepository(
  client: CooksmithSupabaseClient,
): ShoppingRepository {
  const database = client.schema('cooksmith')
  const selection =
    'id, household_id, display_name, quantity, unit, category, completed, position, updated_at'

  return {
    async list(householdId) {
      const result = await database
        .from('shopping_list_items')
        .select(selection)
        .eq('household_id', householdId)
        .order('completed')
        .order('position')
        .order('display_name')
      shoppingError(result.error)
      return ((result.data ?? []) as unknown as ShoppingRow[]).map(mapRow)
    },

    async create(householdId, input) {
      const result = await database
        .from('shopping_list_items')
        .insert({
          household_id: householdId,
          display_name: input.name,
          quantity: input.quantity,
          unit: input.unit,
          category: input.category,
        } as never)
        .select(selection)
        .single()
      shoppingError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save that shopping item.')
      return mapRow(result.data as unknown as ShoppingRow)
    },

    async createFromPlan(householdId, inputs) {
      if (inputs.length === 0) return []
      const result = await database
        .from('shopping_list_items')
        .insert(
          inputs.map((input) => ({
            household_id: householdId,
            display_name: input.name,
            quantity: input.quantity,
            unit: input.unit,
            category: input.category,
            manual: false,
          })) as never,
        )
        .select(selection)
      if (result.error?.code === '23505') {
        throw new Error(
          'Someone in your household just added one of those items. Refresh Cooksmith and try again.',
        )
      }
      shoppingError(result.error)
      return ((result.data ?? []) as unknown as ShoppingRow[]).map(mapRow)
    },

    async update(itemId, input) {
      const result = await database
        .from('shopping_list_items')
        .update({
          display_name: input.name,
          quantity: input.quantity,
          unit: input.unit,
          category: input.category,
        } as never)
        .eq('id', itemId)
        .select(selection)
        .single()
      shoppingError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update that shopping item.')
      return mapRow(result.data as unknown as ShoppingRow)
    },

    async setCompleted(itemId, completed) {
      const result = await database
        .from('shopping_list_items')
        .update({ completed } as never)
        .eq('id', itemId)
        .select(selection)
        .single()
      shoppingError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update that shopping item.')
      return mapRow(result.data as unknown as ShoppingRow)
    },

    async remove(itemId) {
      const result = await database.from('shopping_list_items').delete().eq('id', itemId)
      shoppingError(result.error)
    },
  }
}
