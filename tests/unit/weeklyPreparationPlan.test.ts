import { describe, expect, it } from 'vitest'

import {
  applyAndValidateModelDecision,
  buildDeterministicWeeklyPreparationPlan,
  createWeeklyPreparationCacheKey,
  type WeeklyPreparationCandidate,
} from '../../src/domain/get-ahead/weeklyPreparationPlan'

function candidate(
  id: string,
  overrides: Partial<WeeklyPreparationCandidate> = {},
): WeeklyPreparationCandidate {
  return {
    id,
    householdId: 'household-1',
    planId: 'plan-1',
    plannedMealId: `meal-${id}`,
    recipeId: `recipe-${id}`,
    recipeVersionId: `recipe-version-${id}`,
    enrichmentVersion: 'recipe-intelligence-v1',
    servings: 4,
    sourceIngredientId: `ingredient-${id}`,
    sourceStepIds: [`step-${id}`],
    originalText: '1 onion, diced',
    canonicalIngredient: 'onion',
    canonicalAction: 'dice',
    preparationDetail: null,
    quantity: { state: 'known', value: 1, unit: null },
    maximumLeadTimeHours: 24,
    storageGuidanceReference: null,
    boundaries: [],
    confidence: 'high',
    ...overrides,
  }
}

describe('weekly preparation plan', () => {
  it('combines canonical equivalents with traceable quantities and sources', () => {
    const plan = buildDeterministicWeeklyPreparationPlan([candidate('a'), candidate('b')])

    expect(plan.generation).toBe('deterministic')
    expect(plan.tasks).toHaveLength(1)
    expect(plan.tasks[0]).toMatchObject({
      canonicalCategory: 'onion',
      decision: 'combined',
      reasonCode: 'compatible',
      subtasks: [{ quantity: { state: 'known', value: 2, unit: null } }],
    })
    expect(plan.tasks[0]?.subtasks[0]?.sources.map((source) => source.recipeVersionId)).toEqual([
      'recipe-version-a',
      'recipe-version-b',
    ])
  })

  it('groups meaningful cut differences without combining their quantities', () => {
    const plan = buildDeterministicWeeklyPreparationPlan([
      candidate('a'),
      candidate('b', {
        canonicalAction: 'roughly_chop',
        preparationDetail: 'rough',
        originalText: '1 onion, roughly chopped',
      }),
    ])

    expect(plan.tasks[0]).toMatchObject({
      title: 'Prepare onion',
      decision: 'grouped',
      reasonCode: 'meaningful_preparation_difference',
    })
    expect(plan.tasks[0]?.subtasks).toHaveLength(2)
  })

  it.each([
    ['incompatible units', { quantity: { state: 'known', value: 1, unit: 'kg' } }],
    ['storage boundary', { boundaries: ['storage'] }],
    ['raw protein boundary', { boundaries: ['raw-protein'] }],
    ['batch component boundary', { boundaries: ['batch-component'] }],
  ] as const)('does not combine across a %s', (_name, override) => {
    const plan = buildDeterministicWeeklyPreparationPlan([
      candidate('a'),
      candidate('b', override as Partial<WeeklyPreparationCandidate>),
    ])
    expect(plan.tasks[0]?.decision).toBe('grouped')
    expect(plan.tasks[0]?.subtasks).toHaveLength(2)
  })

  it('never converts an unknown quantity into a number', () => {
    const plan = buildDeterministicWeeklyPreparationPlan([
      candidate('a', { quantity: { state: 'unknown', value: null, unit: null } }),
      candidate('b', { quantity: { state: 'unknown', value: null, unit: null } }),
    ])
    expect(plan.tasks[0]?.subtasks.every((subtask) => subtask.quantity.value === null)).toBe(true)
  })

  it('keeps low-confidence inputs distinct and limits model decisions to supplied ambiguity', () => {
    const candidates = [
      candidate('a', { confidence: 'low' }),
      candidate('b', { canonicalAction: 'chop', confidence: 'low' }),
    ]
    const fallback = buildDeterministicWeeklyPreparationPlan(candidates)
    expect(fallback.ambiguousCandidateIds).toEqual(['a', 'b'])

    expect(
      applyAndValidateModelDecision(fallback, candidates, {
        groups: [{ candidateIds: ['invented'], decision: 'grouped' }],
      }),
    ).toEqual({ ok: false, reason: 'unsupported_reference' })
  })

  it('rejects a model attempt to combine incompatible source candidates', () => {
    const candidates = [
      candidate('a', { confidence: 'low' }),
      candidate('b', {
        canonicalAction: 'slice',
        confidence: 'low',
        boundaries: ['cross-contamination'],
      }),
    ]
    const fallback = buildDeterministicWeeklyPreparationPlan(candidates)
    expect(
      applyAndValidateModelDecision(fallback, candidates, {
        groups: [{ candidateIds: ['a', 'b'], decision: 'combined' }],
      }),
    ).toEqual({ ok: false, reason: 'unsafe_combination' })
  })

  it('invalidates the cache key for plan, recipe or enrichment version changes', () => {
    const original = [candidate('a')]
    expect(createWeeklyPreparationCacheKey(original)).not.toBe(
      createWeeklyPreparationCacheKey([candidate('a', { recipeVersionId: 'recipe-version-new' })]),
    )
    expect(createWeeklyPreparationCacheKey(original)).not.toBe(
      createWeeklyPreparationCacheKey([
        candidate('a', { enrichmentVersion: 'recipe-intelligence-v2' }),
      ]),
    )
    expect(createWeeklyPreparationCacheKey(original)).not.toBe(
      createWeeklyPreparationCacheKey([candidate('a', { plannedMealId: 'meal-new' })]),
    )
    expect(createWeeklyPreparationCacheKey(original)).not.toBe(
      createWeeklyPreparationCacheKey([candidate('a', { servings: 6 })]),
    )
  })

  it('requires a model decision to cover every ambiguous candidate', () => {
    const candidates = [
      candidate('a', { confidence: 'low' }),
      candidate('b', { canonicalAction: 'chop', confidence: 'low' }),
    ]
    const fallback = buildDeterministicWeeklyPreparationPlan(candidates)
    expect(
      applyAndValidateModelDecision(fallback, candidates, {
        groups: [{ candidateIds: ['a'], decision: 'separate' }],
      }),
    ).toEqual({ ok: false, reason: 'incomplete_decision' })
  })
})
