import { describe, expect, it } from 'vitest'

import {
  applyGetAheadOverride,
  buildGetAheadTasks,
  createGetAheadSession,
  endGetAheadSessionEarly,
  getAheadPriorityScoreVersion,
  getAheadTotals,
  moveGetAheadTask,
  toggleGetAheadTask,
  validateGetAheadDuration,
} from '../../src/domain/get-ahead/session'
import {
  preparationOpportunityRuleVersion,
  type PreparationOpportunity,
} from '../../src/domain/get-ahead/preparationOpportunities'

function opportunity(id: string, type: PreparationOpportunity['type']): PreparationOpportunity {
  return {
    id,
    ruleVersion: preparationOpportunityRuleVersion,
    type,
    householdId: 'household-1',
    plannedMealId: 'meal-1',
    mealDate: '2026-07-24',
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Soup',
    recipeUpdatedAt: '2026-07-24T00:00:00.000Z',
    source: {
      kind: 'step',
      stepId: `step-${id}`,
      position: 1,
      text: type === 'sauce' ? 'Make the pesto sauce' : 'Chop onions',
    },
    ingredient: null,
    reason: 'Recipe instruction includes preparation.',
  }
}

function ingredientOpportunity(input: {
  id: string
  recipeId: string
  mealId: string
  quantity: string
  unit: string | null
  name?: string
  preparation?: string
}): PreparationOpportunity {
  const name = input.name ?? 'onion'
  const preparation = input.preparation ?? 'diced'
  return {
    ...opportunity(input.id, 'chop'),
    recipeId: input.recipeId,
    recipeName: input.recipeId,
    plannedMealId: input.mealId,
    source: {
      kind: 'ingredient',
      ingredientId: `ingredient-${input.id}`,
      position: 1,
      text: preparation,
    },
    ingredient: {
      name,
      quantity: input.quantity,
      unit: input.unit,
      preparation,
    },
  }
}

describe('Get Ahead session domain', () => {
  it('validates custom whole-minute durations', () => {
    expect(validateGetAheadDuration(4)).toBe('Choose at least 5 minutes.')
    expect(validateGetAheadDuration(241)).toBe('Choose 240 minutes or less.')
    expect(validateGetAheadDuration(15.5)).toBe('Enter a whole number of minutes.')
    expect(validateGetAheadDuration(45)).toBeNull()
  })

  it('fits deterministic whole tasks within selected time', () => {
    const tasks = buildGetAheadTasks(
      [opportunity('a', 'chop'), opportunity('b', 'marinate'), opportunity('c', 'sauce')],
      30,
    )
    expect(tasks.filter((task) => task.selected).map((task) => task.opportunityId)).toEqual(['b'])
    expect(
      tasks.filter((task) => task.selected).reduce((sum, task) => sum + task.estimatedMinutes, 0),
    ).toBeLessThanOrEqual(30)
  })

  it('summarises task instructions from the source opportunity', () => {
    const tasks = buildGetAheadTasks([opportunity('pesto', 'sauce')], 20)
    expect(tasks[0].title).toBe('Make pesto sauce')
  })

  it('records versioned score evidence and a structured explanation', () => {
    const session = createGetAheadSession({
      householdId: 'household-1',
      planId: '2026-W30',
      selectedMinutes: 45,
      opportunities: [opportunity('a', 'chop'), opportunity('b', 'marinate')],
    })
    expect(session.scoreVersion).toBe(getAheadPriorityScoreVersion)
    expect(session.tasks[0].scoreEvidence).toMatchObject({
      version: getAheadPriorityScoreVersion,
      factors: { freshnessConstraint: 'not-claimed' },
    })
    expect(session.recommendationExplanation).toContain('Recommended because')
  })

  it('keeps stable tie-breaking for identical score inputs', () => {
    const tasks = buildGetAheadTasks(
      [opportunity('b', 'chop'), opportunity('a', 'chop'), opportunity('c', 'chop')],
      20,
    )
    expect(tasks.filter((task) => task.selected).map((task) => task.opportunityId)).toEqual([
      'a',
      'b',
    ])
  })

  it('excludes, includes, reorders and reverts user overrides without exceeding time', () => {
    const session = createGetAheadSession({
      householdId: 'household-1',
      planId: '2026-W30',
      selectedMinutes: 35,
      opportunities: [
        opportunity('a', 'chop'),
        opportunity('b', 'marinate'),
        opportunity('c', 'sauce'),
      ],
    })
    const excluded = applyGetAheadOverride(session, 'task_b', 'excluded')
    expect(excluded.conflict).toBeNull()
    expect(excluded.session.tasks.find((task) => task.id === 'task_b')?.selected).toBe(false)
    const included = applyGetAheadOverride(excluded.session, 'task_b', 'included')
    expect(included.conflict).toBeNull()
    expect(included.session.tasks.find((task) => task.id === 'task_b')?.selected).toBe(true)
    const moved = moveGetAheadTask(included.session, 'task_b', 'down')
    expect(moved.overrides.orderedTaskIds).toContain('task_b')
    const reverted = applyGetAheadOverride(moved, 'task_b', 'revert')
    expect(reverted.session.overrides.includedTaskIds).not.toContain('task_b')
  })

  it('reports include conflicts instead of silently exceeding selected time', () => {
    const session = createGetAheadSession({
      householdId: 'household-1',
      planId: '2026-W30',
      selectedMinutes: 15,
      opportunities: [opportunity('a', 'chop'), opportunity('b', 'marinate')],
    })
    const result = applyGetAheadOverride(session, 'task_b', 'included')
    expect(result.conflict).toContain('exceed your available time')
    expect(getAheadTotals(result.session).plannedMinutes).toBeLessThanOrEqual(15)
  })

  it('persists snapshots and idempotent task state transitions', () => {
    const session = createGetAheadSession({
      householdId: 'household-1',
      planId: '2026-W30',
      selectedMinutes: 15,
      opportunities: [opportunity('a', 'chop')],
      now: new Date('2026-07-24T10:00:00.000Z'),
    })
    const completed = toggleGetAheadTask(
      session,
      session.tasks[0].id,
      'completed',
      new Date('2026-07-24T10:01:00.000Z'),
    )
    const completedAgain = toggleGetAheadTask(
      completed,
      session.tasks[0].id,
      'completed',
      new Date('2026-07-24T10:02:00.000Z'),
    )
    expect(completedAgain.tasks[0].state).toBe('completed')
    expect(completedAgain.status).toBe('completed')
    expect(getAheadTotals(completedAgain)).toMatchObject({
      completedMinutes: 10,
      estimatedTimeSavedMinutes: 10,
    })
  })

  it('ends early without discarding completed task state', () => {
    const session = createGetAheadSession({
      householdId: 'household-1',
      planId: '2026-W30',
      selectedMinutes: 30,
      opportunities: [opportunity('a', 'chop'), opportunity('b', 'sauce')],
    })
    const completed = toggleGetAheadTask(
      session,
      session.tasks.find((task) => task.selected)?.id ?? '',
      'completed',
    )
    const ended = endGetAheadSessionEarly(completed, new Date('2026-07-24T11:00:00.000Z'))
    expect(ended.status).toBe('ended')
    expect(ended.tasks.find((task) => task.selected)?.state).toBe('completed')
    expect(getAheadTotals(ended).remainingMinutes).toBeGreaterThan(0)
  })

  it('consolidates compatible ingredient preparation into one stable multi-source task', () => {
    const tasks = buildGetAheadTasks(
      [
        ingredientOpportunity({
          id: 'b',
          recipeId: 'tacos',
          mealId: 'meal-2',
          quantity: '1',
          unit: null,
        }),
        ingredientOpportunity({
          id: 'a',
          recipeId: 'pasta',
          mealId: 'meal-1',
          quantity: '2',
          unit: null,
        }),
      ],
      30,
    )
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      title: 'Dice 3 Onion',
      consolidation: {
        version: 'get-ahead-consolidation-v1',
        displayQuantity: '3',
        displayUnit: null,
      },
    })
    expect(tasks[0].consolidation?.sources.map((source) => source.opportunityId)).toEqual([
      'a',
      'b',
    ])
  })

  it('keeps ambiguous or incompatible quantities separate', () => {
    const tasks = buildGetAheadTasks(
      [
        ingredientOpportunity({
          id: 'a',
          recipeId: 'pasta',
          mealId: 'meal-1',
          quantity: 'a pinch',
          unit: null,
        }),
        ingredientOpportunity({
          id: 'b',
          recipeId: 'tacos',
          mealId: 'meal-2',
          quantity: '1',
          unit: null,
        }),
        ingredientOpportunity({
          id: 'c',
          recipeId: 'curry',
          mealId: 'meal-3',
          quantity: '100',
          unit: 'g',
        }),
      ],
      30,
    )
    expect(tasks).toHaveLength(3)
    expect(tasks.every((task) => task.consolidation === null)).toBe(true)
  })
})
