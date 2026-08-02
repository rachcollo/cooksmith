export type WeeklyPreparationSettings = {
  aiEnabled: boolean
  emergencyStop: boolean
  modelIdentifier: string
  corpusVersion: string
  promptVersion: string
  smokeVerified: boolean
  updatedAt: string
}

export type WeeklyPreparationEvaluation = {
  id: string
  status: 'running' | 'completed' | 'failed'
  accepted: boolean
  createdAt: string
  planCount: number
  deterministicCount: number
  modelCallCount: number
  validOutputCount: number
  fallbackCount: number
  qualityFailureCount: number
  reviewedCorrectCount: number
  unsupportedCount: number
  averageLatencyMs: number
  inputTokens: number
  outputTokens: number
  estimatedCostAud: number
  ambiguousDecision: 'accepted' | 'rejected' | 'fallback'
  acceptanceEligible: boolean
  reviewMessage: string | null
  failureReasons: Array<{ reason: string; count: number }>
  failedCases: WeeklyPreparationEvaluationCaseEvidence[]
}

export type WeeklyPreparationEvaluationCaseEvidence = {
  caseNumber: number
  caseKey: string
  outcome: 'model-assisted' | 'fallback' | 'failed'
  reason: string
  availableMinutes: number | null
  mealNames: string[]
  generatedTasks: Array<{
    title: string
    estimatedMinutes: number
    estimatedTimeSavedMinutes: number
  }>
}

export type RecipeEnrichmentBackfillStatus = {
  paused: boolean
  aiEnabled: boolean
  monthlyCostLimitAud: number
  recoverableCount: number
  sources: {
    household: { eligible: number; current: number }
    sharedPlatform: { eligible: number; current: number }
  }
  states: Partial<Record<'pending' | 'processing' | 'completed' | 'failed' | 'cancelled', number>>
  latestProviderFailure: {
    httpStatus: number
    errorCode?: string
    errorParam?: string
    requestId?: string
    failedAt: string
  } | null
}

export type AdminRecipeEnrichment = {
  recipeId: string
  sourceKind: 'household' | 'shared_platform'
  name: string
  ownerLabel: string
  updatedAt: string
  status: 'preparing' | 'ready' | 'failed' | 'not_scheduled'
  completedAt: string | null
  aiActive: boolean
  retryable: boolean
  canEdit: boolean
}

export interface WeeklyPreparationAdminRepository {
  getSettings(): Promise<WeeklyPreparationSettings>
  updateSettings(input: {
    aiEnabled: boolean
    emergencyStop: boolean
  }): Promise<WeeklyPreparationSettings>
  getLatestEvaluation(): Promise<WeeklyPreparationEvaluation | null>
  runEvaluation(): Promise<void>
  acceptEvaluation(runId: string): Promise<void>
  getRecipeEnrichmentStatus(): Promise<RecipeEnrichmentBackfillStatus>
  commandRecipeEnrichment(
    command:
      | 'start'
      | 'pause'
      | 'resume'
      | 'retry_failed'
      | 'reprocess_ai'
      | 'recover_exhausted_ai_failures',
  ): Promise<RecipeEnrichmentBackfillStatus>
  setRecipeIntelligenceAi(enabled: boolean): Promise<RecipeEnrichmentBackfillStatus>
  listRecipeEnrichments(input?: {
    query?: string
    status?: AdminRecipeEnrichment['status'] | 'all'
  }): Promise<AdminRecipeEnrichment[]>
  retryRecipeEnrichment(
    recipeId: string,
    sourceKind: AdminRecipeEnrichment['sourceKind'],
  ): Promise<void>
}
