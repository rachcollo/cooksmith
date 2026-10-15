import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isWeeklyPreparationCandidateEligible } from '../../src/domain/get-ahead/weeklyPreparationPlan'

const householdId = '10000000-0000-4000-8000-000000000001'
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
const planId = `${tomorrow}_${tomorrow}`
let handler: (request: Request) => Promise<Response>
let action: string
let leadHours: number
let member: boolean
let workerPayload: { candidates: Parameters<typeof isWeeklyPreparationCandidateEligible>[0][] }

beforeEach(async () => {
  vi.resetModules()
  action = 'simmer'
  leadHours = 48
  member = true
  workerPayload = { candidates: [] }
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) => (name === 'SUPABASE_URL' ? 'https://project.example' : 'test-only'),
    },
    serve: (callback: typeof handler) => {
      handler = callback
    },
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname
      if (path === '/auth/v1/user') return Response.json({ id: 'test-user' })
      if (path === '/rest/v1/rpc/is_active_household_member') return Response.json(member)
      if (path === '/rest/v1/planned_meals')
        return Response.json([
          { id: 'meal', recipe_id: 'recipe', imported_recipe_id: null, meal_date: tomorrow },
        ])
      if (path === '/rest/v1/household_settings') return Response.json([{ default_servings: 4 }])
      if (path === '/rest/v1/household_recipes')
        return Response.json([
          {
            id: 'recipe',
            name: 'Synthetic tomato sauce',
            recipe_ingredients: [{ original_line_text: '400 g tomatoes' }],
            recipe_steps: [{ instruction: 'Simmer tomatoes until cooked.' }],
          },
        ])
      if (path === '/rest/v1/recipe_enrichments')
        return Response.json([
          {
            id: 'enrichment',
            activated_at: '2026-01-01T00:00:00Z',
            source_kind: 'household',
            recipe_id: 'recipe',
            imported_recipe_id: null,
            recipe_version_id: 'version',
            schema_version: 'recipe-intelligence-v3',
            rules_version: 'cooksmith-rules-v4',
            result: {
              ingredients: [],
              preparationOpportunities: [
                {
                  opportunityId: 'sauce',
                  action,
                  kind: 'component_cook',
                  canonicalIngredient: 'tomato sauce',
                  sourceIngredientIds: ['ingredient'],
                  sourceStepIds: ['step'],
                  maximumLeadTimeHours: leadHours,
                  title: 'Cook tomato sauce',
                  preparationDetail: 'Cook sauce completely',
                  ingredientLines: ['400 g tomatoes'],
                  instructionSteps: ['Simmer tomatoes until cooked.'],
                  stoppingPoint: 'Sauce is fully cooked.',
                  finishingGuidance: 'Reheat thoroughly.',
                  storageGuidance: 'Refrigerate covered for up to 2 days.',
                  boundaries: ['batch-component'],
                  confidence: 'high',
                },
              ],
            },
          },
        ])
      if (path === '/rest/v1/recipe_content_versions')
        return Response.json([
          {
            id: 'version',
            source_snapshot: {
              ingredients: [{ id: 'ingredient', originalText: '400 g tomatoes' }],
              steps: [{ id: 'step', instruction: 'Simmer tomatoes until cooked.' }],
            },
          },
        ])
      if (path === '/functions/v1/generate-weekly-preparation-plan') {
        workerPayload = JSON.parse(String(init?.body))
        return Response.json({
          plan: { householdId, planId, tasks: [{ id: 'validated-worker-task' }] },
        })
      }
      throw new Error(`Unexpected request: ${path}`)
    }),
  )
  await import('../../supabase/functions/get-weekly-preparation-plan/index')
})

afterEach(() => vi.unstubAllGlobals())

function requestPlan() {
  return handler(
    new Request('https://project.example/functions/v1/get-weekly-preparation-plan', {
      method: 'POST',
      headers: { authorization: 'Bearer test-user', 'content-type': 'application/json' },
      body: JSON.stringify({
        householdId,
        weekStart: tomorrow,
        weekEnd: tomorrow,
        availableMinutes: 30,
      }),
    }),
  )
}

describe('household enrichment to weekly worker boundary', () => {
  it('passes a source-linked simmer component to the weekly worker and returns its plan', async () => {
    const response = await requestPlan()
    expect(response.status).toBe(200)
    expect(workerPayload.candidates).toHaveLength(1)
    const candidate = workerPayload.candidates[0]!
    expect(candidate).toMatchObject({
      householdId,
      planId,
      canonicalAction: 'simmer',
      opportunityKind: 'component_cook',
      recipeId: 'recipe',
      recipeVersionId: 'version',
      sourceIngredientId: 'ingredient',
      sourceStepIds: ['step'],
      maximumLeadTimeHours: 48,
      storageGuidanceReference: 'provider-validated-cooked-storage',
    })
    expect(isWeeklyPreparationCandidateEligible(candidate)).toBe(true)
    expect(await response.json()).toMatchObject({
      plan: { householdId, planId, tasks: [{ id: 'validated-worker-task' }] },
    })
  })

  it('still excludes unsupported actions without calling the weekly worker', async () => {
    action = 'invented-action'
    expect((await requestPlan()).status).toBe(422)
    expect(workerPayload.candidates).toHaveLength(0)
  })

  it('still excludes supported actions beyond their storage window', async () => {
    leadHours = 12
    expect((await requestPlan()).status).toBe(422)
    expect(workerPayload.candidates).toHaveLength(0)
  })

  it('rejects an unrelated household before reading its recipes or calling the worker', async () => {
    member = false
    expect((await requestPlan()).status).toBe(403)
    expect(vi.mocked(fetch).mock.calls).toHaveLength(2)
    expect(workerPayload.candidates).toHaveLength(0)
  })
})
