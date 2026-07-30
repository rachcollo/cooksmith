npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
export type WeeklyPreparationSettings = {
  aiEnabled: boolean;
  emergencyStop: boolean;
  modelIdentifier: string;
  updatedAt: string;
};

export type WeeklyPreparationEvaluation = {
  createdAt: string;
  planCount: number;
  deterministicCount: number;
  modelCallCount: number;
  validOutputCount: number;
  fallbackCount: number;
  reviewedCorrectCount: number;
  unsupportedCount: number;
  averageLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostAud: number;
  ambiguousDecision: "accepted" | "rejected" | "fallback";
};

export type RecipeEnrichmentBackfillStatus = {
  paused: boolean;
  aiEnabled: boolean;
  monthlyCostLimitAud: number;
  recoverableCount: number;
  sources: {
    household: { eligible: number; current: number };
    sharedPlatform: { eligible: number; current: number };
  };
  states: Partial<
    Record<
      "pending" | "processing" | "completed" | "failed" | "cancelled",
      number
    >
  >;
  latestProviderFailure: {
    httpStatus: number;
    errorCode?: string;
    errorParam?: string;
    requestId?: string;
    failedAt: string;
  } | null;
};

export interface WeeklyPreparationAdminRepository {
  getSettings(): Promise<WeeklyPreparationSettings>;
  updateSettings(input: {
    aiEnabled: boolean;
    emergencyStop: boolean;
  }): Promise<WeeklyPreparationSettings>;
  getLatestEvaluation(): Promise<WeeklyPreparationEvaluation | null>;
  getRecipeEnrichmentStatus(): Promise<RecipeEnrichmentBackfillStatus>;
  commandRecipeEnrichment(
    command:
      | "start"
      | "pause"
      | "resume"
      | "retry_failed"
      | "reprocess_ai"
      | "recover_exhausted_ai_failures",
  ): Promise<RecipeEnrichmentBackfillStatus>;
  setRecipeIntelligenceAi(
    enabled: boolean,
  ): Promise<RecipeEnrichmentBackfillStatus>;
}
npm notice
npm notice New minor version of npm available! 11.9.0 -> 11.19.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.19.0
npm notice To update run: npm install -g npm@11.19.0
npm notice
