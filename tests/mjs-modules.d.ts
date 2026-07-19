declare module '*.mjs' {
  type Check = { ok: boolean; message: string }
  type Report = { ok: boolean; text: string }

  export const collectPreflight: (options: Record<string, unknown>) => Check[]
  export const formatPreflight: (checks: Check[]) => Report
  export const environmentVariableNames: string[]

  export const collectGovernanceChecks: (options: Record<string, unknown>) => Check[]
  export const formatGovernanceReport: (checks: Check[]) => Report

  export const collectSecretChecks: (options: Record<string, unknown>) => Check[]
  export const formatSecretReport: (checks: Check[]) => Report
  export const listTrackedFiles: (cwd: string, runner?: unknown) => string[]

  export const verifyDeployment: (baseUrl: string) => Promise<Check[]>
  export const formatVerification: (checks: Check[]) => Report

  export const createDeliverySummary: (options: Record<string, unknown>) => string

  export const STATUS_RANK: Record<string, number>
  export const readConfig: (
    env: Record<string, unknown>,
  ) => { baseUrl: string; email: string; token: string } | null
  export const transitionForward: (
    config: unknown,
    issueKey: string,
    targetStatusName: string,
  ) => Promise<{ moved: boolean; reason?: string }>
  export const HANDLERS: Record<
    string,
    (config: unknown, args: Record<string, unknown>) => Promise<void>
  >

  export const assessPackageReadiness: (options: Record<string, unknown>) => Check[]
  export const formatReadinessReport: (checks: Check[]) => Report

  type SelectionEvaluation = { key: string; eligible: boolean; reason: string | null }
  type SelectionResult = {
    selected: string | null
    reason?: string
    busyWith?: string
    priority?: string | null
    summary?: string
    evaluated: SelectionEvaluation[]
  }
  export const selectNextReadyIssue: (options: Record<string, unknown>) => Promise<SelectionResult>
  export const formatSelectionReport: (result: SelectionResult) => string
}
