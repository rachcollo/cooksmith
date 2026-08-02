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

  it('uses the caller JWT for membership and protected household data before privileged loading', () => {
    const source = readFileSync(edgeFunctionSources[2], 'utf8')
    const membershipSource = readFileSync(
      'src/infrastructure/get-ahead/weeklyPreparationMembership.ts',
      'utf8',
    )
    const membershipCheck = source.indexOf('verifyActiveHouseholdMember({')
    const householdData = source.indexOf('fetchWeeklyPreparationHouseholdData<T>({')
    const mealLoad = source.indexOf('householdData<MealRow[]>(')
    const settingsLoad = source.indexOf('householdData<Array<{ default_servings: number }>>(')
    const enrichmentLoad = source.indexOf('rest<EnrichmentRow[]>(')

    expect(source).toContain('verifyActiveHouseholdMember({')
    expect(source).toContain('authorisation,')
    expect(source).toContain('householdId: body.householdId')
    expect(source).not.toContain('household_members?')
    expect(membershipSource).toContain('/rest/v1/rpc/is_active_household_member')
    expect(membershipSource).toContain('authorization: authorisation')
    expect(membershipSource).toContain('body: JSON.stringify({ target_household_id: householdId })')
    expect(membershipCheck).toBeGreaterThan(0)
    expect(householdData).toBeGreaterThan(membershipCheck)
    expect(mealLoad).toBeGreaterThan(membershipCheck)
    expect(settingsLoad).toBeGreaterThan(mealLoad)
    expect(enrichmentLoad).toBeGreaterThan(settingsLoad)
    expect(source).not.toContain('rest<MealRow[]>(')
    expect(source).not.toContain('rest<Array<{ default_servings: number }>>(')
  })

  it('returns privacy-safe household flow failure categories', () => {
    const source = readFileSync(edgeFunctionSources[2], 'utf8')

    expect(source).toContain("error: 'authentication_unavailable'")
    expect(source).toContain("error: 'membership_verification_unavailable'")
    expect(source).toContain("error: 'household_unavailable'")
    expect(source).toContain("error: 'enrichment_unavailable'")
    expect(source).toContain("error: 'plan_data_unavailable'")
    expect(source).toContain("error: 'worker_configuration_unavailable'")
    expect(source).toContain("error: 'worker_unavailable'")
    expect(source).toContain("error: 'worker_response_invalid'")
    expect(source).not.toContain("error: 'temporarily_unavailable'")
  })

  it('recovers an interrupted evaluation and rejects a concurrent evaluation', () => {
    const source = readFileSync(edgeFunctionSources[0], 'utf8')

    expect(source).toContain("return 'evaluation_already_running'")
    expect(source).toContain("error_reason: 'evaluation_interrupted'")
  })

  it('uses an OpenAI-compatible schema and retains safe partial evaluation evidence', () => {
    const evaluationSource = readFileSync(edgeFunctionSources[0], 'utf8')
    const adapterSource = readFileSync(
      'supabase/functions/generate-weekly-preparation-plan/openaiAdapter.ts',
      'utf8',
    )

    expect(adapterSource).not.toContain('uniqueItems')
    expect(adapterSource).not.toContain('minItems')
    expect(adapterSource).toContain('availableMinutes')
    expect(adapterSource).toContain('Review every selected meal as one portfolio')
    expect(adapterSource).toContain('An empty task list is correct')
    expect(adapterSource).toContain("response.headers.get('x-request-id')")
    expect(adapterSource).toContain('body.error?.param')
    expect(adapterSource).toContain("error.name === 'TimeoutError'")
    expect(adapterSource).toContain("throw new Error('schema_invalid')")
    expect(evaluationSource).toContain("event: 'weekly_preparation_evaluation_provider_failure'")
    expect(evaluationSource).toContain("await rest('weekly_preparation_evaluation_cases'")
    expect(evaluationSource).toContain('deterministic_count: deterministicCount')
    expect(evaluationSource).toContain('error_reason: errorReason')
    expect(evaluationSource).toContain("error_reason: reviewPassed ? null : 'review_failed'")
    expect(evaluationSource).toContain('reason_code: reasonCode')
    expect(evaluationSource).toContain('rejected_count: rejectedCount')
    expect(evaluationSource).toContain('if (reviewPassed)')
    expect(evaluationSource).not.toContain("reason_code: outcome === 'fallback' ? 'validation'")
  })

  it('sends the selected duration and full meal context to the planning worker', () => {
    const source = readFileSync(edgeFunctionSources[2], 'utf8')

    expect(source).toContain('availableMinutes: body.availableMinutes')
    expect(source).toContain('meals: planningContext(')
    expect(source).toContain('recipe_steps(instruction)')
    expect(source).toContain('instruction_steps')
  })

  it('binds the approved deployment identity before deploying functions', () => {
    const workflow = readFileSync('.github/workflows/production-edge-function-release.yml', 'utf8')
    const bind = workflow.indexOf('Bind hosted evaluation evidence to the approved commit')
    const deploy = workflow.indexOf('Deploy authenticated import-recipe function')

    expect(bind).toBeGreaterThan(0)
    expect(bind).toBeLessThan(deploy)
  })

  it('uses short aliases for evaluation relationships in the Admin query', () => {
    const source = readFileSync(
      'src/infrastructure/admin/supabaseWeeklyPreparationAdminRepository.ts',
      'utf8',
    )

    expect(source).toContain(
      'acceptances:weekly_preparation_evaluation_acceptances(id)',
    )
    expect(source).toContain(
      'cases:weekly_preparation_evaluation_cases(reason_code)',
    )
    expect(source).toContain('data.cases ?? []')
    expect(source).toContain('Boolean(data.acceptances)')
    expect(source).not.toContain(
      'weekly_preparation_evaluation_acceptances(id), weekly_preparation_evaluation_cases(reason_code)',
    )
  })

  it.each([
    ['configuration_incomplete', 'missing provider or release configuration'],
    ['evaluation_persistence_unavailable', 'could not access Cooksmith evaluation storage'],
    ['administrator_required', 'administrator access could not be verified'],
    ['authorisation_unavailable', 'could not verify administrator access'],
    ['evaluation_already_running', 'evaluation is already running'],
    ['evaluation_failed', 'started but could not complete'],
    ['provider_rejected', 'provider rejected the evaluation request'],
    ['provider_rate_limited', 'provider is temporarily rate limited'],
    ['provider_unavailable', 'provider is temporarily unavailable'],
    ['provider_output_invalid', 'provider returned an invalid evaluation response'],
    ['review_failed', 'one or more cases failed review'],
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
