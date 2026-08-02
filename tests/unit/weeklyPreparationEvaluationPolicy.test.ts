import { describe, expect, it } from 'vitest'

import { passesWeeklyPreparationEvaluation } from '../../src/domain/get-ahead/weeklyPreparationEvaluationPolicy'

const evidence = {
  planCount: 30,
  modelCallCount: 30,
  validOutputCount: 30,
  fallbackCount: 0,
  unsupportedCount: 0,
  reviewedCorrectCount: 28,
}

describe('weekly preparation evaluation policy', () => {
  it('accepts 28 of 30 valid plans for explicit administrator review', () => {
    expect(passesWeeklyPreparationEvaluation(evidence)).toBe(true)
    expect(passesWeeklyPreparationEvaluation({ ...evidence, reviewedCorrectCount: 29 })).toBe(true)
    expect(passesWeeklyPreparationEvaluation({ ...evidence, reviewedCorrectCount: 30 })).toBe(true)
  })

  it('rejects a quality result below the threshold', () => {
    expect(passesWeeklyPreparationEvaluation({ ...evidence, reviewedCorrectCount: 27 })).toBe(false)
  })

  it.each([
    { validOutputCount: 29 },
    { fallbackCount: 1 },
    { unsupportedCount: 1 },
    { modelCallCount: 29, validOutputCount: 29 },
    { planCount: 29, modelCallCount: 29, validOutputCount: 29 },
  ])('keeps hard validation evidence at zero tolerance: %o', (override) => {
    expect(passesWeeklyPreparationEvaluation({ ...evidence, ...override })).toBe(false)
  })
})
