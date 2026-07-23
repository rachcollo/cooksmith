import type { PantryItem, PantryItemInput } from '../../domain/pantry/types'
import type { PantryReconciliationProposal } from '../../domain/pantry/reconciliation'

export interface PantryRepository {
  list(householdId: string): Promise<PantryItem[]>
  create(householdId: string, input: PantryItemInput): Promise<PantryItem>
  update(itemId: string, input: PantryItemInput): Promise<PantryItem>
  reconcile?(
    householdId: string,
    proposal: PantryReconciliationProposal,
  ): Promise<PantryItem | null>
  remove(itemId: string): Promise<void>
}
