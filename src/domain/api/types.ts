export const apiVersion = 'v1' as const

export type ApiVersion = typeof apiVersion

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'validation_failed'
  | 'internal_error'

export type ApiError = {
  code: ApiErrorCode
  message: string
  correlationId: string
  details?: Record<string, unknown>
}

export type ApiResult<T> =
  { ok: true; data: T; correlationId: string } | { ok: false; error: ApiError }

export type ApiRequestOptions = {
  accessToken: string
  correlationId?: string
  signal?: AbortSignal
}
