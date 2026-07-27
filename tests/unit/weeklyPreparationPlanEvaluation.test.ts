import { describe, expect, it } from 'vitest'

import {
  buildDeterministicWeeklyPreparationPlan,
  type WeeklyPreparationCandidate,
} from '../../src/domain/get-ahead/weeklyPreparationPlan'

function candidate(plan: number, recipe: number, action = 'dice'): WeeklyPreparationCandidate {
  const id = `plan-${plan}-recipe-${recipe}`
  return {
    id,
    householdId: 'evaluation-household',
    planId: `plan-${plan}`,
    plannedMealId: `meal-${id}`,
    recipeId: `recipe-${id}`,
    recipeVersionId: `version-${id}`,
    enrichmentVersion: 'recipe-intelligence-v1',
    servings: 4,
    sourceIngredientId: `ingredient-${id}`,
    sourceStepIds: [`step-${id}`],
    originalText: `1 onion, ${action}d`,
    canonicalIngredient: 'onion',
    canonicalAction: action,
    preparationDetail: action,
    quantity: { state: 'known', value: 1, unit: null },
    maximumLeadTimeHours: 24,
    storageGuidanceReference: null,
    boundaries: [],
    confidence: 'high',
  }
}

describe('Weekly preparation representative evaluation', () => {
  it('evaluates thirty synthetic weekly plans without invented or untraceable data', () => {
    const corpus = Array.from({ length: 30 }, (_, index) => {
      const planNumber = index + 1
      const candidates = [
        candidate(planNumber, 1),
        candidate(planNumber, 2),
        candidate(planNumber, 3, index % 3 === 0 ? 'roughly_chop' : 'dice'),
      ]
      return { candidates, plan: buildDeterministicWeeklyPreparationPlan(candidates) }
    })

    expect(corpus).toHaveLength(30)
    expect(corpus.every(({ plan }) => plan.generation === 'deterministic')).toBe(true)
    expect(
      corpus.every(({ candidates, plan }) => {
        const supplied = new Set(candidates.map((item) => item.id))
        return plan.tasks.every((task) =>
          task.subtasks.every((subtask) =>
            subtask.sources.every((source) => supplied.has(source.id)),
          ),
        )
      }),
    ).toBe(true)
    expect(corpus.filter(({ plan }) => plan.tasks[0]?.decision === 'combined')).toHaveLength(20)
    expect(corpus.filter(({ plan }) => plan.tasks[0]?.decision === 'grouped')).toHaveLength(10)
  })
})
