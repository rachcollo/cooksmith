import { z } from 'zod'

import {
  apiVersion,
  type ApiError,
  type ApiRequestOptions,
  type ApiResult,
} from '../../domain/api/types'
import { createCorrelationId } from '../../shared/utils/createCorrelationId'

const errorCodeSchema = z.enum([
  'bad_request',
  'unauthenticated',
  'forbidden',
  'not_found',
  'rate_limited',
  'validation_failed',
  'internal_error',
])

const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  correlationId: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
})

type Fetcher = typeof fetch

export type ApiClient = {
  get<T>(path: string, schema: z.ZodType<T>, options: ApiRequestOptions): Promise<ApiResult<T>>
  post<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    options: ApiRequestOptions,
  ): Promise<ApiResult<T>>
}

export function createApiClient(baseUrl: string, fetcher: Fetcher = fetch): ApiClient {
  const normalisedBaseUrl = baseUrl.replace(/\/+$/, '')

  return {
    get: (path, schema, options) =>
      request('GET', normalisedBaseUrl, path, undefined, schema, options, fetcher),
    post: (path, body, schema, options) =>
      request('POST', normalisedBaseUrl, path, body, schema, options, fetcher),
  }
}

async function request<T>(
  method: 'GET' | 'POST',
  baseUrl: string,
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  options: ApiRequestOptions,
  fetcher: Fetcher,
): Promise<ApiResult<T>> {
  const correlationId = options.correlationId ?? createCorrelationId()
  const response = await fetcher(`${baseUrl}/api-${apiVersion}${normalisePath(path)}`, {
    method,
    signal: options.signal,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
      'x-correlation-id': correlationId,
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    return { ok: false, error: normaliseApiError(payload, correlationId, response.status) }
  }

  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'validation_failed',
        message: 'Cooksmith received an unexpected response. Please try again.',
        correlationId,
      },
    }
  }

  return { ok: true, data: parsed.data, correlationId }
}

function normalisePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function normaliseApiError(payload: unknown, correlationId: string, status: number): ApiError {
  const parsed = apiErrorSchema.safeParse(payload)

  if (parsed.success) {
    return parsed.data
  }

  return {
    code: status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : 'internal_error',
    message: 'Cooksmith could not complete that request. Please try again.',
    correlationId,
  }
}
