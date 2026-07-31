import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { createSupabaseWeeklyPreparationAdminRepository } from '../../src/infrastructure/admin/supabaseWeeklyPreparationAdminRepository'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'

const edgeFunctionSources = [
  'supabase/functions/evaluate-weekly-preparation/index.ts',
  'supabase/functions/generate-weekly-preparation-plan/index.ts',
  'supabase/functions/get-weekly-preparation-plan/index.ts',
]

describe('weekly preparation Edge Function contracts', () => {
  it.each(edgeFunctionSources)('%s targets the Cooksmith REST schema', (path) => {
    const source = readFileSync(path, 'utf8')

    expect(source).toContain("'accept-profile': 'cooksmith'")
    expect(source).toContain("'content-profile': 'cooksmith'")
  })

  it('keeps the hosted evaluation model identity aligned with the provider model', () => {
    const source = readFileSync(edgeFunctionSources[0], 'utf8')

    expect(source).toContain('settings.model_identifier !== model')
    expect(source).toContain('model_identifier: model')
    expect(source).toContain('smoke_verified_at: null')
  })

  it('checks administrator access with the caller JWT instead of reading the roles table', () => {
    const source = readFileSync(edgeFunctionSources[0], 'utf8')

    expect(source).toContain('/rest/v1/rpc/has_application_role')
    expect(source).toContain("body: JSON.stringify({ required_role: 'admin' })")
    expect(source).not.toContain('app_user_roles?')
  })

  it('recovers an interrupted evaluation and rejects a concurrent evaluation', () => {
    const source = readFileSync(edgeFunctionSources[0], 'utf8')

    expect(source).toContain("return 'evaluation_already_running'")
    expect(source).toContain("error_reason: 'evaluation_interrupted'")
  })

  it.each([
    ['configuration_incomplete', 'missing provider or release configuration'],
    ['evaluation_persistence_unavailable', 'could not access Cooksmith evaluation storage'],
    ['administrator_required', 'administrator access could not be verified'],
    ['authorisation_unavailable', 'could not verify administrator access'],
    ['evaluation_already_running', 'evaluation is already running'],
    ['evaluation_failed', 'started but could not complete'],
  ])('shows a safe admin message for %s', async (code, expectedMessage) => {
    const invoke = vi.fn(async () => ({
      data: null,
      error: {
        context: new Response(JSON.stringify({ error: code }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
      },
    }))
    const client = {
      schema: vi.fn(() => ({})),
      functions: { invoke },
    } as unknown as CooksmithSupabaseClient

    await expect(
      createSupabaseWeeklyPreparationAdminRepository(client).runEvaluation(),
    ).rejects.toThrow(expectedMessage)
  })
})
