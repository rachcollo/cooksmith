import type { PostgrestError } from '@supabase/supabase-js'

import type { PantryRepository } from '../../application/pantry/pantryRepository'
import { applyQuantityDelta } from '../../domain/pantry/reconciliation'
import type { PantryItem } from '../../domain/pantry/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

export type PantryRow = {
  quantity_untracked?: boolean
  id: string
  household_id: string
  name: string
  category: PantryItem['category']
  category_source: PantryItem['categorySource']
  storage_location: PantryItem['storageLocation']
  storage_location_source: PantryItem['storageLocationSource']
  classification_version: number | null
  quantity: number | string | null
  unit: string | null
  available: boolean
  is_default: boolean
  updated_at: string
}

export function mapPantryRow(row: PantryRow): PantryItem {
  return {
    quantityUntracked: row.quantity_untracked ?? false,
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    category: row.category,
    categorySource: row.category_source,
    storageLocation: row.storage_location,
    storageLocationSource: row.storage_location_source,
    classificationVersion: row.classification_version,
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
    '23514': 'Check the item name, location, unit and quantity.',
    '42501': 'You do not have permission to change this pantry.',
  }
  throw new Error(messages[error.code] ?? 'Cooksmith could not update the pantry. Try again.')
}

export function createSupabasePantryRepository(client: CooksmithSupabaseClient): PantryRepository {
  const database = client.schema('cooksmith')
  const selection =
    'quantity_untracked, id, household_id, name, category, category_source, storage_location, storage_location_source, classification_version, quantity, unit, available, is_default, updated_at'

  return {
    async list(householdId) {
      const result = await database
        .from('household_pantry_items')
        .select(selection)
        .eq('household_id', householdId)
        .order('storage_location')
        .order('name')
      pantryError(result.error)
      return ((result.data ?? []) as unknown as PantryRow[]).map(mapPantryRow)
    },

    async create(householdId, input) {
      const result = await database
        .rpc('save_pantry_item_v2', { p_household_id: householdId, p_input: { ...input } })
        .single()
      pantryError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save the pantry item.')
      return mapPantryRow(result.data as unknown as PantryRow)
    },

    async update(itemId, input) {
      const result = await database
        .rpc('save_pantry_item_v2', { p_item_id: itemId, p_input: { ...input } })
        .single()
      pantryError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update the pantry item.')
      return mapPantryRow(result.data as unknown as PantryRow)
    },

    async reconcile(householdId, proposal) {
      if (proposal.kind === 'skip') return null
      if (proposal.kind === 'create') return this.create(householdId, proposal.input)
      const existing = await database
        .from('household_pantry_items')
        .select(selection)
        .eq('household_id', householdId)
        .eq('id', proposal.pantryItemId)
        .single()
      pantryError(existing.error)
      if (!existing.data) throw new Error('Cooksmith could not find that pantry item.')
      const pantryItem = mapPantryRow(existing.data as unknown as PantryRow)
      return this.update(proposal.pantryItemId, applyQuantityDelta(pantryItem, proposal.quantity))
    },

    async remove(itemId) {
      const result = await database.from('household_pantry_items').delete().eq('id', itemId)
      pantryError(result.error)
    },
  }
}
