import { describe, expect, it } from 'vitest'

import {
  applyQuantityDelta,
  buildCookedMealProposals,
  buildPutAwayProposal,
  reconciliationKey,
} from '../../src/domain/pantry/reconciliation'
import type { PantryItem } from '../../src/domain/pantry/types'

const pantryItem: PantryItem = {
  id: 'pantry-milk',
  householdId: 'household-1',
  name: 'Milk',
  category: 'dairy',
  categorySource: 'explicit',
  storageLocation: 'fridge',
  storageLocationSource: 'explicit',
  classificationVersion: null,
  quantity: 1,
  unit: 'L',
  available: true,
  isDefault: false,
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('pantry reconciliation', () => {
  it('proposes an idempotent put-away increment for a compatible pantry match', () => {
    const proposal = buildPutAwayProposal(
      { id: 'shopping-milk', name: 'Milk', quantity: 2, unit: 'L' },
      [pantryItem],
    )

    expect(proposal).toMatchObject({
      kind: 'increment',
      pantryItemId: 'pantry-milk',
      quantity: 2,
      unit: 'L',
      idempotencyKey: 'shopping-put-away:shopping-milk',
    })
  })

  it('does not guess when a cooked meal is free text or units are incompatible', () => {
    expect(buildCookedMealProposals('meal-1', true, [], [pantryItem])).toEqual([
      expect.objectContaining({ kind: 'skip', reason: 'free-text' }),
    ])
    expect(
      buildCookedMealProposals(
        'meal-1',
        false,
        [{ id: 'ingredient-1', name: 'Milk', quantity: '100', unit: 'ml' }],
        [pantryItem],
      ),
    ).toEqual([expect.objectContaining({ kind: 'skip', reason: 'incompatible-quantity' })])
  })

  it('keeps retries from changing an already reviewed line and clamps deductions at zero', () => {
    const reviewed = new Set([reconciliationKey('shopping-put-away', 'shopping-milk')])
    expect(
      buildPutAwayProposal(
        { id: 'shopping-milk', name: 'Milk', quantity: 2, unit: 'L' },
        [pantryItem],
        reviewed,
      ),
    ).toMatchObject({ kind: 'skip', reason: 'already-reviewed' })
    expect(applyQuantityDelta(pantryItem, -5)).toMatchObject({ quantity: 0, available: false })
  })
})
