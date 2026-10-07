import type { FreezerRepository } from '../../application/freezer/freezerRepository'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'
export function createSupabaseFreezerRepository(
  client: CooksmithSupabaseClient,
): FreezerRepository {
  const db = client.schema('cooksmith')
  return {
    async list(householdId) {
      const stock = await db
        .from('freezer_meals')
        .select('*, freezer_meal_reservations(portions,state)')
        .eq('household_id', householdId)
        .order('name')
      if (stock.error)
        throw new Error('Could not load prepared freezer meals. Try refreshing Cooksmith.')
      return (stock.data ?? []).map((row) => {
        const reserved = (row.freezer_meal_reservations ?? [])
          .filter((r) => r.state === 'reserved')
          .reduce((sum, r) => sum + r.portions, 0)
        return {
          id: row.id,
          householdId: row.household_id,
          name: row.name,
          portions: row.portions,
          frozenOn: row.frozen_on,
          useFirstOn: row.use_first_on,
          notes: row.notes,
          householdRecipeId: row.household_recipe_id,
          importedRecipeId: row.imported_recipe_id,
          archivedAt: row.archived_at,
          revision: row.revision,
          reserved,
          available: Math.max(0, row.portions - reserved),
        }
      })
    },
    async command(householdId, command) {
      const result = await db.rpc('freezer_command', {
        p_household_id: householdId,
        p_operation_id: command.operationId,
        p_action: command.action,
        p_freezer_id: command.freezerId,
        ...(command.planId ? { p_plan_id: command.planId } : {}),
        p_payload: command.payload,
      })
      if (result.error) {
        const messages: Record<string, string> = {
          '23514':
            'Check the details and available portions. Another member may have reserved this stock.',
          PT409:
            'Stock changed. Close this form, refresh and check the latest portions before editing.',
          '42501': 'This freezer meal or plan is no longer available to your household.',
        }
        throw new Error(
          messages[result.error.code] ??
            'Could not save the freezer change. Retry the same action to recover safely.',
        )
      }
    },
  }
}
