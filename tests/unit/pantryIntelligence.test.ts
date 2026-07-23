import { describe, expect, it } from 'vitest'

import { createPantryInsights } from '../../src/domain/pantry/intelligence'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import type { PantryItem } from '../../src/domain/pantry/types'

const householdId = '20000000-0000-4000-8000-000000000001'

function item(overrides: Partial<PantryItem>): PantryItem {
  return {
    id: 'pantry-1',
    householdId,
    name: 'Milk',
    category: 'dairy',
    categorySource: 'explicit',
    storageLocation: 'fridge',
    storageLocationSource: 'explicit',
    classificationVersion: null,
    quantity: 1,
    unit: 'item',
    available: true,
    isDefault: false,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 'meal-1',
    householdId,
    mealDate: '2026-01-02',
    mealType: 'dinner',
    title: 'Pasta with milk sauce',
    notes: null,
    recipeId: null,
    recipeSource: null,
    linkedRecipe: null,
    recipeState: { kind: 'free-text' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('explainable pantry intelligence', () => {
  it('creates deterministic low-stock and out-of-stock suggestions without duplicating listed items', () => {
    const insights = createPantryInsights({
      pantryItems: [item({}), item({ id: 'pantry-2', name: 'Rice', available: false })],
      shoppingItems: [
        {
          id: 'shopping-1',
          householdId,
          name: 'Rice',
          quantity: null,
          unit: null,
          category: 'pantry',
          completed: false,
          position: 0,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      plannedMeals: [],
    })

    expect(insights).toHaveLength(1)
    expect(insights[0]).toMatchObject({
      id: 'low-stock:pantry-1',
      itemName: 'Milk',
      kind: 'low_stock',
      ruleVersion: 'pantry-intelligence-v1',
    })
  })

  it('prefers an upcoming meal explanation and honours dismissals', () => {
    const insights = createPantryInsights({
      pantryItems: [item({ available: false })],
      shoppingItems: [],
      plannedMeals: [meal({})],
      dismissedInsightIds: new Set(['recently-out:pantry-1']),
    })

    expect(insights).toHaveLength(1)
    expect(insights[0]?.kind).toBe('upcoming_need')
    expect(insights[0]?.reason).toContain('Pasta with milk sauce')
  })
})
