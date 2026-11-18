declare module '*.mjs' {
  type Check = { ok: boolean; message: string }
  type Report = { ok: boolean; text: string }

  export const collectPreflight: (options: Record<string, unknown>) => Check[]
  export const formatPreflight: (checks: Check[]) => Report
  export const environmentVariableNames: string[]
  export const supportsNodeVersion: (
    version: string,
    minimum?: string,
    maximumMajor?: number,
  ) => boolean

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

  type AuditVulnerability = { severity: string; via: unknown[] }
  type AuditEntry = [string, AuditVulnerability]
  export const assessProductionAudit: (report: {
    vulnerabilities?: Record<string, AuditVulnerability>
  }) => { accepted: AuditEntry[]; blocking: AuditEntry[] }

  export const reviewedManifest: (raw: string, digest: string, baseline: string) => unknown
  export const adoptRecovery: (options: Record<string, unknown>) => Promise<unknown>
  export const validateRecovery: (manifest: unknown, snapshot: unknown, baseline: string) => unknown
  export const assertNormalAdmission: (cwd?: string) => never
  export const inventorySnapshot: (
    branches: unknown[],
    pulls: unknown[],
  ) => {
    branches: { name: string; sha: string }[]
    pulls: {
      number: number
      branch: string
      sha: string
      repository: string
      base: string
      baseRepository: string
      baseSha: string
      draft: boolean
    }[]
  }
  export const LOCK: string
  export const CLAIMS: string
  export const admitBuild: (options: Record<string, unknown>) => Promise<SelectionResult>
  export const githubClaimStore: (config: Record<string, string>) => {
    currentMain: () => Promise<string>
    create: (ref: string, data: unknown, baseline: string) => Promise<string>
    list: () => Promise<Record<string, unknown>[]>
    assertOwned: (ref: string, sha: string) => Promise<void>
    removeOwned: (ref: string, sha: string) => Promise<void>
  }
  export const independent: (a: unknown, b: unknown) => boolean
  export const readSafety: (cwd: string, key: string) => unknown
  export const verifySafety: (options: Record<string, unknown>) => Promise<boolean>

  type SelectionEvaluation = { key: string; eligible: boolean; reason: string | null }
  type SelectionResult = {
    selected: string | null
    reason?: string
    busyWith?: string
    inFlight?: string[]
    maxParallelBuilds?: number
    priority?: string | null
    summary?: string
    evaluated: SelectionEvaluation[]
  }
  export const selectNextReadyIssue: (options: Record<string, unknown>) => Promise<SelectionResult>
  export const formatSelectionReport: (result: SelectionResult) => string
  export const resolveMaxParallelBuilds: (value: unknown) => number
  export const DEFAULT_MAX_PARALLEL_BUILDS: number
}
