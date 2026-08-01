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
    storageGuidanceReference: 'refrigerate-covered-and-labelled',
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
  ] as const)('does not combine across a %s', (name, override) => {
    const plan = buildDeterministicWeeklyPreparationPlan([
      candidate('a'),
      candidate('b', override as Partial<WeeklyPreparationCandidate>),
    ])
    if (name === 'raw protein boundary') {
      expect(plan.tasks).toHaveLength(1)
      expect(plan.tasks[0]?.subtasks[0]?.sources.map((source) => source.id)).toEqual(['a'])
    } else {
      expect(plan.tasks[0]?.decision).toBe('grouped')
      expect(plan.tasks[0]?.subtasks).toHaveLength(2)
    }
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
    expect(fallback.tasks).toEqual([])

    expect(
      applyAndValidateModelDecision(fallback, candidates, {
        tasks: [
          {
            candidateIds: ['invented'],
            title: 'Dice the onions',
            estimatedMinutes: 10,
            estimatedTimeSavedMinutes: 10,
          },
        ],
      }),
    ).toEqual({ ok: false, reason: 'unsupported_reference' })
  })

  it('rejects a model attempt to use an unsafe source candidate', () => {
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
        tasks: [
          {
            candidateIds: ['a', 'b'],
            title: 'Prepare the vegetables',
            estimatedMinutes: 10,
            estimatedTimeSavedMinutes: 15,
          },
        ],
      }),
    ).toEqual({ ok: false, reason: 'unsafe_make_ahead_task' })
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

  it('rejects a model strategy that exceeds the available time', () => {
    const candidates = [
      candidate('a', { confidence: 'low' }),
      candidate('b', { canonicalAction: 'chop', confidence: 'low' }),
    ]
    const fallback = buildDeterministicWeeklyPreparationPlan(candidates)
    expect(
      applyAndValidateModelDecision(
        fallback,
        candidates,
        {
          tasks: [
            {
              candidateIds: ['a'],
              title: 'Dice the onions',
              estimatedMinutes: 35,
              estimatedTimeSavedMinutes: 20,
            },
          ],
        },
        30,
      ),
    ).toEqual({ ok: false, reason: 'time_budget_exceeded' })
  })

  it('accepts a useful five-meal strategy and excludes malformed cooking fragments', () => {
    const candidates = [
      candidate('onion'),
      candidate('carrot', { canonicalIngredient: 'carrot', canonicalAction: 'chop' }),
      candidate('capsicum', { canonicalIngredient: 'capsicum', canonicalAction: 'slice' }),
      candidate('garlic', {
        canonicalIngredient: 'garlic cloves',
        canonicalAction: 'cook',
        originalText: 'garlic cloves (, finely minced)',
      }),
      candidate('herbs', { canonicalIngredient: 'herbs', canonicalAction: 'chop' }),
    ]
    const fallback = buildDeterministicWeeklyPreparationPlan(candidates)
    const result = applyAndValidateModelDecision(
      fallback,
      candidates,
      {
        tasks: [
          {
            candidateIds: ['onion', 'carrot'],
            title: 'Dice the onion and chop the carrot',
            estimatedMinutes: 12,
            estimatedTimeSavedMinutes: 20,
          },
          {
            candidateIds: ['capsicum', 'herbs'],
            title: 'Slice the capsicum and chop the herbs',
            estimatedMinutes: 10,
            estimatedTimeSavedMinutes: 15,
          },
        ],
      },
      30,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.tasks).toHaveLength(2)
    expect(result.value.tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0)).toBe(22)
    expect(JSON.stringify(result.value.tasks)).not.toContain('garlic cloves (')
  })
})
