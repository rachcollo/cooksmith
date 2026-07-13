export function createCorrelationId() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}`
}
