type LogLevel = 'info' | 'warn' | 'error'

type LogDetails = Record<string, boolean | number | string | undefined>

const sensitiveKeyPattern = /(authorization|cookie|email|password|secret|token)/i

function sanitise(details: LogDetails = {}) {
  return Object.fromEntries(
    Object.entries(details)
      .filter(([key]) => !sensitiveKeyPattern.test(key))
      .filter(([, value]) => value !== undefined),
  )
}

function write(level: LogLevel, event: string, details?: LogDetails) {
  if (import.meta.env.MODE === 'test') return

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitise(details),
  }

  if (level === 'error') console.error(payload)
  else if (level === 'warn') console.warn(payload)
  else console.info(payload)
}

export const logger = {
  info: (event: string, details?: LogDetails) => write('info', event, details),
  warn: (event: string, details?: LogDetails) => write('warn', event, details),
  error: (event: string, details?: LogDetails) => write('error', event, details),
}

export const loggingInternals = { sanitise }
