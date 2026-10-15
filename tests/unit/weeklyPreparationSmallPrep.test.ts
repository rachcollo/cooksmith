import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildWeeklyPreparationEvaluationCorpus } from '../../src/domain/get-ahead/weeklyPreparationEvaluationCorpus'
import {
  applyAndValidateModelDecision,
  buildDeterministicWeeklyPreparationPlan,
  isWeeklyPreparationCandidateEligible,
} from '../../src/domain/get-ahead/weeklyPreparationPlan'
import { decideAmbiguousPreparation } from '../../supabase/functions/generate-weekly-preparation-plan/openaiAdapter'

const corpus = buildWeeklyPreparationEvaluationCorpus()
afterEach(() => vi.unstubAllGlobals())
describe('Luna small useful preparation regressions', () => {
  it.each([3, 9, 11, 14, 20, 22, 25])(
    'case %i accepts realistic grouped prep with full eligible source coverage',
    async (number) => {
      const fixture = corpus[number - 1]!
      const candidates = fixture.candidates.filter(isWeeklyPreparationCandidateEligible)
      const decision = {
        tasks: [
          {
            candidateIds: candidates.map((c) => c.id),
            title: 'Prepare ingredients for meals',
            estimatedMinutes: candidates.length === 3 ? 12 : 8,
            estimatedTimeSavedMinutes: 5,
          },
        ],
      }
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({
            status: 'completed',
            output: [{ content: [{ type: 'output_text', text: JSON.stringify(decision) }] }],
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
        ),
      )
      const result = await decideAmbiguousPreparation({
        apiKey: 'synthetic-key',
        model: 'gpt-6-luna',
        candidates: fixture.candidates,
        meals: fixture.meals,
        availableMinutes: fixture.availableMinutes,
        timeoutMs: 1000,
      })
      const validated = applyAndValidateModelDecision(
        buildDeterministicWeeklyPreparationPlan(fixture.candidates),
        fixture.candidates,
        result.decision,
        fixture.availableMinutes,
        { allowEmpty: true },
      )
      expect(validated.ok).toBe(true)
      if (!validated.ok) return
      const tasks = validated.value.tasks
      expect(tasks.length).toBeGreaterThanOrEqual(fixture.minimumUsefulTasks)
      const minutes = tasks.reduce((total, t) => total + (t.estimatedMinutes ?? 0), 0)
      expect(minutes).toBeGreaterThanOrEqual(fixture.minimumUsefulMinutes)
      expect(minutes).toBeLessThanOrEqual(fixture.availableMinutes)
      const sources = tasks.flatMap((t) => t.subtasks.flatMap((s) => s.sources))
      expect(new Set(sources.map((s) => s.id))).toEqual(new Set(candidates.map((c) => c.id)))
      expect(new Set(sources.map((s) => s.plannedMealId)).size).toBeGreaterThanOrEqual(
        fixture.minimumMealsCovered,
      )
    },
  )
  it('keeps empty and omitted-cucumber decisions valid but below existing quality expectations', () => {
    const fixture = corpus[10]!
    const fallback = buildDeterministicWeeklyPreparationPlan(fixture.candidates)
    for (const tasks of [
      [],
      [
        {
          candidateIds: [fixture.candidates[1]!.id],
          title: 'Chop red onion',
          estimatedMinutes: 5,
          estimatedTimeSavedMinutes: 5,
        },
      ],
    ]) {
      const result = applyAndValidateModelDecision(
        fallback,
        fixture.candidates,
        { tasks },
        fixture.availableMinutes,
        { allowEmpty: true },
      )
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      const meals = new Set(
        result.value.tasks.flatMap((t) =>
          t.subtasks.flatMap((s) => s.sources.map((source) => source.plannedMealId)),
        ),
      )
      expect(meals.size).toBeLessThan(fixture.minimumMealsCovered)
    }
  })
  it('rejects unsupported feta and below-minimum task durations', () => {
    const fixture = corpus[10]!
    const fallback = buildDeterministicWeeklyPreparationPlan(fixture.candidates)
    const task = {
      candidateIds: [fixture.candidates[2]!.id],
      title: 'Crumble feta for dinner',
      estimatedMinutes: 5,
      estimatedTimeSavedMinutes: 5,
    }
    expect(applyAndValidateModelDecision(fallback, fixture.candidates, { tasks: [task] })).toEqual({
      ok: false,
      reason: 'unsafe_make_ahead_task',
    })
    expect(
      applyAndValidateModelDecision(fallback, fixture.candidates, {
        tasks: [{ ...task, candidateIds: [fixture.candidates[0]!.id], estimatedMinutes: 2 }],
      }),
    ).toEqual({ ok: false, reason: 'invalid_estimate' })
  })
  it('adds grouping guidance only to Luna and retains the strict request and safety boundary', async () => {
    const payloads: Array<{
      input: Array<{ content: string }>
      text: { format: { strict: boolean } }
    }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, request) => {
        payloads.push(JSON.parse(request.body))
        return Response.json({
          status: 'completed',
          output: [{ content: [{ type: 'output_text', text: '{"tasks":[]}' }] }],
        })
      }),
    )
    for (const model of ['gpt-6-luna', 'gpt-4.1-mini'])
      await decideAmbiguousPreparation({
        apiKey: 'synthetic-key',
        model,
        candidates: corpus[2]!.candidates,
        timeoutMs: 1000,
      })
    expect(payloads[0]!.input[0]!.content).toContain('Group the work session')
    expect(payloads[0]!.input[0]!.content).toContain('Never invent quantities')
    expect(payloads[0]!.text.format.strict).toBe(true)
    expect(payloads[1]!.input[0]!.content).not.toContain('Group the work session')
  })
})
