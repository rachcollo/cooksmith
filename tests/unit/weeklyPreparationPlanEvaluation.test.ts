import { describe, expect, it } from 'vitest'

import {
  buildDeterministicWeeklyPreparationPlan,
  type WeeklyPreparationCandidate,
} from '../../src/domain/get-ahead/weeklyPreparationPlan'
import { buildWeeklyPreparationEvaluationCorpus } from '../../src/domain/get-ahead/weeklyPreparationEvaluationCorpus'

function candidate(plan: number, recipe: number, action = 'dice'): WeeklyPreparationCandidate {
  const id = `plan-${plan}-recipe-${recipe}`
  return {
    id,
    householdId: 'evaluation-household',
    planId: `plan-${plan}`,
    plannedMealId: `meal-${id}`,
    recipeId: `recipe-${id}`,
    recipeVersionId: `version-${id}`,
    enrichmentVersion: 'recipe-intelligence-v2',
    servings: 4,
    sourceIngredientId: `ingredient-${id}`,
    sourceStepIds: [`step-${id}`],
    originalText: `1 onion, ${action}d`,
    canonicalIngredient: 'onion',
    canonicalAction: action,
    preparationDetail: action,
    quantity: { state: 'known', value: 1, unit: null },
    maximumLeadTimeHours: 24,
    storageGuidanceReference: 'refrigerate-covered-and-labelled',
    boundaries: [],
    confidence: 'high',
  }
}

describe('Weekly preparation representative evaluation', () => {
  it('uses thirty varied cases with duration, safety and honest-empty coverage', () => {
    const corpus = buildWeeklyPreparationEvaluationCorpus()

    expect(corpus).toHaveLength(30)
    expect(new Set(corpus.map((item) => item.key)).size).toBe(30)
    expect(new Set(corpus.map((item) => item.availableMinutes))).toEqual(new Set([15, 30, 45, 60]))
    expect(corpus.filter((item) => item.expectedEmpty)).toHaveLength(3)
    expect(
      corpus.some((item) =>
        item.candidates.some((candidate) => candidate.boundaries.includes('raw-protein')),
      ),
    ).toBe(true)
    expect(corpus.some((item) => item.minimumUsefulTasks === 1)).toBe(true)
    expect(corpus.every((item) => item.expectedEmpty || item.minimumUsefulTasks === 1)).toBe(true)
    expect(corpus.some((item) => !item.expectedEmpty && item.minimumMealsCovered >= 2)).toBe(true)
    expect(
      corpus
        .filter((item) => item.key.startsWith('raw-protein-boundary'))
        .every((item) => item.minimumUsefulTasks === 1),
    ).toBe(true)
    expect(
      corpus.some((item) =>
        item.candidates.some(
          (candidate) =>
            [
              'chop',
              'dice',
              'grate',
              'marinate',
              'mince',
              'roughly_chop',
              'shred',
              'slice',
            ].includes(candidate.canonicalAction ?? '') &&
            /\b(?:cook|serve|preheat)\b/i.test(candidate.originalText),
        ),
      ),
    ).toBe(true)
  })

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
