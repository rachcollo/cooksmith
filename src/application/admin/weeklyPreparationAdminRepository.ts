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
