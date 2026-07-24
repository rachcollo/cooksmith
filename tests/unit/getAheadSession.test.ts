import { describe, expect, it } from 'vitest'

import {
  buildGetAheadTasks,
  createGetAheadSession,
  endGetAheadSessionEarly,
  getAheadTotals,
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
    source: { kind: 'step', stepId: `step-${id}`, position: 1, text: 'Chop onions' },
    reason: 'Recipe instruction includes preparation.',
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
    expect(tasks.map((task) => task.opportunityId)).toEqual(['a', 'c'])
    expect(tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBeLessThanOrEqual(30)
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
    const completed = toggleGetAheadTask(session, session.tasks[0].id, 'completed')
    const ended = endGetAheadSessionEarly(completed, new Date('2026-07-24T11:00:00.000Z'))
    expect(ended.status).toBe('ended')
    expect(ended.tasks[0].state).toBe('completed')
    expect(getAheadTotals(ended).remainingMinutes).toBe(20)
  })
})
