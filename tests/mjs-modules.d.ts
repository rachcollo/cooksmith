declare module '*.mjs' {
  export const collectPreflight: (
    options: Record<string, unknown>,
  ) => Array<{ ok: boolean; message: string }>
  export const formatPreflight: (checks: Array<{ ok: boolean; message: string }>) => {
    ok: boolean
    text: string
  }
  export const environmentVariableNames: string[]
}
