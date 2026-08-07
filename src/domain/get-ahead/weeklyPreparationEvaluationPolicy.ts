export const weeklyPreparationEvaluationPlanCount = 30 as const
export const weeklyPreparationExpectedModelCalls = 28 as const
export const weeklyPreparationMinimumQualityPasses = 28 as const

export function passesWeeklyPreparationEvaluation(input: {
  planCount: number
  modelCallCount: number
  validOutputCount: number
  fallbackCount: number
  unsupportedCount: number
  reviewedCorrectCount: number
}) {
  return (
    input.planCount === weeklyPreparationEvaluationPlanCount &&
    input.modelCallCount === weeklyPreparationExpectedModelCalls &&
    input.validOutputCount === input.modelCallCount &&
    input.fallbackCount === 0 &&
    input.unsupportedCount === 0 &&
    input.reviewedCorrectCount >= weeklyPreparationMinimumQualityPasses
  )
}
