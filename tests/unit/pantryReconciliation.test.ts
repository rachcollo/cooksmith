import { describe, expect, it } from 'vitest'

import {
  applyQuantityDelta,
  buildCookedMealProposals,
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
    const reviewed = new Set([reconciliationKey('meal-cooked', 'meal-1:ingredient-1')])
    expect(
      buildCookedMealProposals(
        'meal-1',
        false,
        [{ id: 'ingredient-1', name: 'Milk', quantity: 1, unit: 'L' }],
        [pantryItem],
        reviewed,
      ),
    ).toMatchObject([{ kind: 'skip', reason: 'already-reviewed' }])
    expect(applyQuantityDelta(pantryItem, -5)).toMatchObject({ quantity: 0, available: false })
  })
})

it('optional adjustments preserve unknown totals and lower-bound confidence', () => {
  expect(applyQuantityDelta({ ...pantryItem, quantity: null }, 2)).toMatchObject({ quantity: null })
  expect(
    applyQuantityDelta({ ...pantryItem, quantity: 2, quantityUntracked: true }, -2),
  ).toMatchObject({ quantity: 0, quantityUntracked: true, available: true })
})
