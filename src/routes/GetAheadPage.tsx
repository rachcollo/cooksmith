import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { FormError } from '../components/ui/FormField'
import { analysePreparationOpportunities } from '../domain/get-ahead/preparationOpportunities'
import {
  applyGetAheadOverride,
  createGetAheadSession,
  endGetAheadSessionEarly,
  getAheadDurationPresets,
  getAheadTotals,
  isTaskStale,
  transitionGetAheadTask,
  validateGetAheadDuration,
  type GetAheadSession,
} from '../domain/get-ahead/session'
import { addDays, currentWeek } from '../domain/meal-plans/week'
import type { PlannedMeal } from '../domain/meal-plans/types'
import type { Recipe } from '../domain/recipes/types'

const storageKey = (householdId: string, planId: string) =>
  `cooksmith:get-ahead:${householdId}:${planId}`
const durationLabels = new Map<number, string>([
  [15, '15 minutes'],
  [30, '30 minutes'],
  [45, '45 minutes'],
  [60, '1 hour'],
  [120, '2 hours'],
])

export function GetAheadPage() {
  const { state } = useOnboarding()
  const plannedMeals = usePlannedMealRepository()
  const recipes = useRecipeRepository()
  const householdId = state.householdId
  const weekStart = currentWeek(new Date())
  const weekEnd = addDays(weekStart, 6)
  const planId = `${weekStart}_${weekEnd}`
  const [meals, setMeals] = useState<PlannedMeal[]>([])
  const [recipeList, setRecipeList] = useState<Recipe[]>([])
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [durationError, setDurationError] = useState<string | null>(null)
  const [session, setSession] = useState<GetAheadSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [lastHiddenTaskId, setLastHiddenTaskId] = useState<string | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)

  useEffect(() => {
    if (!householdId) return
    let active = true
    Promise.all([plannedMeals.listWeek(householdId, weekStart, weekEnd), recipes.list(householdId)])
      .then(([nextMeals, nextRecipes]) => {
        if (!active) return
        setMeals(nextMeals)
        setRecipeList(nextRecipes)
        const saved = localStorage.getItem(storageKey(householdId, planId))
        setSession(saved ? (JSON.parse(saved) as GetAheadSession) : null)
      })
      .catch(() => {
        if (active)
          setError('We could not load your current plan for Get Ahead. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, planId, plannedMeals, recipes, weekEnd, weekStart])

  const opportunities = useMemo(() => {
    return analysePreparationOpportunities(
      meals.map((plannedMeal) => ({
        plannedMeal,
        recipe: recipeList.find((recipe) => recipe.id === plannedMeal.recipeId) ?? null,
      })),
    )
  }, [meals, recipeList])

  const visibleSession = session?.householdId === householdId ? session : null

  function persist(next: GetAheadSession) {
    if (!householdId) return
    localStorage.setItem(storageKey(householdId, planId), JSON.stringify(next))
    setSession(next)
  }

  function updateTask(taskId: string, action: 'complete' | 'reopen' | 'skip' | 'defer') {
    if (!visibleSession) return
    const result = transitionGetAheadTask(visibleSession, taskId, action)
    setOverrideError(result.error)
    if (result.error) return
    persist(result.session)
    if (action === 'skip' || action === 'defer') setLastHiddenTaskId(taskId)
    const label = result.session.tasks.find((task) => task.id === taskId)?.title ?? 'Task'
    const verb =
      action === 'complete'
        ? 'completed'
        : action === 'reopen'
          ? 'reopened'
          : action === 'skip'
            ? 'skipped'
            : 'deferred'
    setAnnouncement(`${label} ${verb}.`)
  }

  function undoLastHiddenTask() {
    if (!lastHiddenTaskId) return
    updateTask(lastHiddenTaskId, 'reopen')
    setLastHiddenTaskId(null)
  }

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateGetAheadDuration(selectedMinutes)
    setDurationError(error)
    if (error || !householdId) return
    const next = createGetAheadSession({ householdId, planId, selectedMinutes, opportunities })
    persist(next)
    setShowChecklist(true)
    setAnnouncement(
      `Get Ahead session created with ${next.tasks.filter((task) => task.selected).length} tasks.`,
    )
  }

  function startFresh() {
    if (!window.confirm('Start fresh and replace this unfinished Get Ahead session?')) return
    const next = createGetAheadSession({
      householdId: householdId ?? '',
      planId,
      selectedMinutes,
      opportunities,
    })
    persist(next)
    setShowChecklist(true)
    setAnnouncement('Fresh Get Ahead session started.')
  }

  function updatePreset(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === 'custom') {
      setCustomMinutes(String(selectedMinutes))
      return
    }
    const next = Number(event.target.value)
    setCustomMinutes('')
    setSelectedMinutes(next)
    setDurationError(null)
  }

  function updateCustom(event: ChangeEvent<HTMLInputElement>) {
    setCustomMinutes(event.target.value)
    const next = Number(event.target.value)
    setSelectedMinutes(next)
    setDurationError(validateGetAheadDuration(next))
  }

  if (loading) return <LoadingState label="Loading Get Ahead" />
  if (error) return <ErrorState title="Get Ahead is unavailable" message={error} />

  return (
    <>
      <DocumentTitle title="Get Ahead" />
      <header className="page-header compact-page-header get-ahead-page-header">
        <div className="page-header-copy">
          <h1>How much prep time do you have today?</h1>
        </div>
      </header>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {!visibleSession || visibleSession.status !== 'active' || !showChecklist ? (
        <Panel className="flow-stack">
          {visibleSession?.status === 'active' ? (
            <div className="resume-session-card">
              <div>
                <strong>Prep session waiting</strong>
                <p>
                  Resume where you left off, or choose more time below and Cooksmith will replan the
                  session.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setShowChecklist(true)}>
                Resume
              </Button>
            </div>
          ) : null}
          <form className="duration-inline-form" onSubmit={startSession}>
            <label className="duration-select-label" htmlFor="duration-preset">
              <span className="sr-only">Preset duration</span>
              <select
                id="duration-preset"
                value={customMinutes ? 'custom' : selectedMinutes}
                onChange={updatePreset}
              >
                {getAheadDurationPresets.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {durationLabels.get(minutes)}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="custom-duration-label" htmlFor="custom-duration">
              <span className="sr-only">Custom minutes</span>
              <input
                id="custom-duration"
                aria-describedby={durationError ? 'custom-duration-error' : undefined}
                aria-invalid={Boolean(durationError)}
                inputMode="numeric"
                min={5}
                max={240}
                placeholder="Mins"
                step={1}
                type="number"
                value={customMinutes}
                onChange={updateCustom}
              />
            </label>
            <Button type="submit">Start</Button>
            {durationError ? (
              <FormError id="custom-duration-error">{durationError}</FormError>
            ) : null}
          </form>
        </Panel>
      ) : (
        <Panel className="flow-stack">
          <GetAheadProgressSummary session={visibleSession} />
          {visibleSession.tasks.filter((task) => task.selected && task.state === 'remaining')
            .length === 0 ? (
            <EmptyState
              title="No preparation tasks found"
              message="Your current plan has no supported Get Ahead opportunities yet."
            />
          ) : null}
          <p>{visibleSession.recommendationExplanation}</p>
          {overrideError ? (
            <FormError id="get-ahead-override-error">{overrideError}</FormError>
          ) : null}
          <ul className="plain-list flow-stack" aria-label="Remaining prep tasks">
            {visibleSession.tasks
              .filter((task) => task.selected && task.state === 'remaining')
              .map((task) => {
                const currentRecipe =
                  recipeList.find((recipe) => recipe.id === task.recipeId) ?? null
                const stale = isTaskStale(task, currentRecipe?.updatedAt ?? null)
                return (
                  <GetAheadTaskRow
                    key={task.id}
                    task={task}
                    stale={stale}
                    onComplete={() => updateTask(task.id, 'complete')}
                    onSkip={() => updateTask(task.id, 'skip')}
                    onDefer={() => updateTask(task.id, 'defer')}
                  />
                )
              })}
          </ul>
          {lastHiddenTaskId ? (
            <Button variant="quiet" onClick={undoLastHiddenTask}>
              Undo last skip or defer
            </Button>
          ) : null}
          {visibleSession.tasks.some((task) => task.state === 'completed') ? (
            <details>
              <summary>Completed prep</summary>
              <ul className="plain-list flow-stack">
                {visibleSession.tasks
                  .filter((task) => task.state === 'completed')
                  .map((task) => (
                    <li className="task-row" key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{task.estimatedMinutes} min estimate</small>
                      </span>
                      <Button variant="secondary" onClick={() => updateTask(task.id, 'reopen')}>
                        Reopen
                      </Button>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
          {visibleSession.tasks.some(
            (task) => task.state === 'skipped' || task.state === 'deferred',
          ) ? (
            <details>
              <summary>Skipped and deferred prep</summary>
              <ul className="plain-list flow-stack">
                {visibleSession.tasks
                  .filter((task) => task.state === 'skipped' || task.state === 'deferred')
                  .map((task) => (
                    <li className="task-row" key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {task.state === 'skipped'
                            ? 'Skipped for this session'
                            : 'Deferred for later'}
                        </small>
                      </span>
                      <Button variant="secondary" onClick={() => updateTask(task.id, 'reopen')}>
                        Restore
                      </Button>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
          {visibleSession.tasks.some((task) => !task.selected) ? (
            <div className="flow-stack">
              <h2>Eligible alternatives</h2>
              <ul className="plain-list flow-stack">
                {visibleSession.tasks
                  .filter((task) => !task.selected)
                  .map((task) => (
                    <li className="task-row" key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{task.estimatedMinutes} min estimate</small>
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const result = applyGetAheadOverride(visibleSession, task.id, 'included')
                          setOverrideError(result.conflict)
                          persist(result.session)
                        }}
                      >
                        Add
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <div className="cluster">
            <Button
              variant="secondary"
              onClick={() => persist(endGetAheadSessionEarly(visibleSession))}
            >
              End early
            </Button>
            <Button variant="quiet" onClick={startFresh}>
              Start fresh
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

function GetAheadProgressSummary({ session }: { session: GetAheadSession }) {
  const totals = getAheadTotals(session)
  return (
    <div className="flow-stack" aria-label="Get Ahead progress summary">
      <div className="cluster">
        <Sparkles aria-hidden="true" />
        <strong>{totals.estimatedTimeSavedMinutes} minutes saved this week</strong>
        <span>{totals.remainingPotentialMinutes} minutes still possible.</span>
      </div>
      <progress aria-label="Prep progress" max={100} value={totals.progressPercent} />
      <p>{totals.progressLabel}.</p>
    </div>
  )
}

function GetAheadTaskRow({
  task,
  stale,
  onComplete,
  onSkip,
  onDefer,
}: {
  task: GetAheadSession['tasks'][number]
  stale: boolean
  onComplete: () => void
  onSkip: () => void
  onDefer: () => void
}) {
  return (
    <li className="task-row">
      <label>
        <input type="checkbox" checked={false} disabled={stale} onChange={onComplete} />
        <span>
          <strong>{task.title}</strong>
          <small>{task.estimatedMinutes} min estimate</small>
          <small>Saves {task.estimatedTimeSavedMinutes} min later</small>
          <small>
            For {task.recipeName} on {task.mealDate}
          </small>
          {task.consolidation ? (
            <details>
              <summary>Supports {task.consolidation.sources.length} planned meals</summary>
              <ul>
                {task.consolidation.sources.map((source) => (
                  <li key={source.opportunityId}>
                    {source.recipeName} on {source.mealDate}
                    {source.sourceQuantity ? (
                      <span>
                        {' '}
                        — {source.sourceQuantity}
                        {source.sourceUnit ? ` ${source.sourceUnit}` : ''}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {stale ? (
            <small role="status">Source changed since this session was created.</small>
          ) : null}
        </span>
      </label>
      <details>
        <summary>More actions for {task.title}</summary>
        <div className="cluster">
          <Button variant="quiet" onClick={onSkip} disabled={stale}>
            Skip
          </Button>
          <Button variant="quiet" onClick={onDefer} disabled={stale}>
            Defer
          </Button>
        </div>
      </details>
    </li>
  )
}
