export type WeeklyPreparationSettings = {
  aiEnabled: boolean
  emergencyStop: boolean
  modelIdentifier: string
  updatedAt: string
}

export type WeeklyPreparationEvaluation = {
  createdAt: string
  planCount: number
  deterministicCount: number
  modelCallCount: number
  validOutputCount: number
  fallbackCount: number
  reviewedCorrectCount: number
  unsupportedCount: number
  averageLatencyMs: number
  inputTokens: number
  outputTokens: number
  estimatedCostAud: number
  ambiguousDecision: 'accepted' | 'rejected' | 'fallback'
}

export interface WeeklyPreparationAdminRepository {
  getSettings(): Promise<WeeklyPreparationSettings>
  updateSettings(input: {
    aiEnabled: boolean
    emergencyStop: boolean
  }): Promise<WeeklyPreparationSettings>
  getLatestEvaluation(): Promise<WeeklyPreparationEvaluation | null>
}
