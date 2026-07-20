import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { RefreshCw, X } from 'lucide-react'

import { usePlannedMealRepository } from '../../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../../app/recipes/recipeContext'
import { useShoppingRepository } from '../../app/shopping/shoppingContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { IconButton } from '../../components/ui/IconButton'
import {
  proposeWeekMeals,
  randomReplacementRecipe,
  recipeSourceForPlan,
  type WeekMealProposal,
  type WeekPlanProposal,
} from '../../domain/meal-plans/weekGeneration'
import type { PlannedMeal } from '../../domain/meal-plans/types'
import { addDays, formatDisplayDate, formatWeekRange, nextWeek } from '../../domain/meal-plans/week'
import type { Recipe } from '../../domain/recipes/types'
import { buildPlanAdditions } from '../../domain/shopping/planGeneration'
import { RecipeSearchField } from './RecipeSearchField'

type Phase = 'loading' | 'choice' | 'confirm-replace' | 'review' | 'success'

interface GenerationState {
  error: string | null
  meals: PlannedMeal[]
  phase: Phase
  plan: WeekPlanProposal | null
  recipes: Recipe[]
  replace: boolean
  weekStart: string
}

interface ProposalDragDetails {
  active: boolean
  sourceDate: string
  startX: number
  startY: number
  targetDate: string
}

function generationMeal(saved: PlannedMeal, recipe: Recipe): PlannedMeal {
  const linkedRecipe = { id: recipe.id, name: recipe.name, archivedAt: recipe.archivedAt }
  return {
    ...saved,
    recipeId: recipe.id,
    recipeSource: recipeSourceForPlan(recipe),
    linkedRecipe,
    recipeState: { kind: 'active', recipe: linkedRecipe },
  }
}

export function WeekPlanGenerator({
  householdId,
  onApplied,
  targetWeek,
}: {
  householdId: string | null | undefined
  onApplied?: () => void | Promise<void>
  targetWeek: string
}) {
  const plannedMeals = usePlannedMealRepository()
  const recipeRepository = useRecipeRepository()
  const shopping = useShoppingRepository()
  const [state, setState] = useState<GenerationState | null>(null)
  const [applying, setApplying] = useState(false)
  const [draggingDate, setDraggingDate] = useState<string | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  const proposalDrag = useRef<ProposalDragDetails | null>(null)

  async function load(target: string) {
    if (!householdId) return
    setState({
      error: null,
      meals: [],
      phase: 'loading',
      plan: null,
      recipes: [],
      replace: false,
      weekStart: target,
    })
    try {
      const [meals, recipes] = await Promise.all([
        plannedMeals.listWeek(householdId, target, addDays(target, 6)),
        recipeRepository.list(householdId),
      ])
      const activeRecipes = recipes.filter((recipe) => !recipe.archivedAt)
      const full =
        new Set(meals.filter((meal) => meal.mealType === 'dinner').map((meal) => meal.mealDate))
          .size >= 7
      setState({
        error: null,
        meals,
        phase: full ? 'choice' : 'review',
        plan: full
          ? null
          : proposeWeekMeals({ meals, recipes: activeRecipes, replace: false, weekStart: target }),
        recipes: activeRecipes,
        replace: false,
        weekStart: target,
      })
    } catch {
      setState((current) =>
        current
          ? {
              ...current,
              error: 'Cooksmith could not prepare this week. Close and try again.',
              phase: 'review',
            }
          : current,
      )
    }
  }

  function prepareReplacement() {
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        phase: 'review',
        plan: proposeWeekMeals({
          meals: current.meals,
          recipes: current.recipes,
          replace: true,
          weekStart: current.weekStart,
        }),
        replace: true,
      }
    })
  }

  function changeProposal(mealDate: string, recipeId: string) {
    setState((current) => {
      if (!current?.plan) return current
      const recipe = current.recipes.find((candidate) => candidate.id === recipeId)
      if (!recipe) return current
      return {
        ...current,
        plan: {
          ...current.plan,
          proposals: current.plan.proposals.map((proposal) =>
            proposal.mealDate === mealDate ? { ...proposal, recipe } : proposal,
          ),
        },
      }
    })
  }

  function replaceProposal(mealDate: string) {
    setState((current) => {
      if (!current?.plan) return current
      const proposal = current.plan.proposals.find((candidate) => candidate.mealDate === mealDate)
      if (!proposal) return current
      const recipe = randomReplacementRecipe(current.recipes, proposal.recipe.id)
      if (!recipe) return current
      return {
        ...current,
        plan: {
          ...current.plan,
          proposals: current.plan.proposals.map((candidate) =>
            candidate.mealDate === mealDate ? { ...candidate, recipe } : candidate,
          ),
        },
      }
    })
  }

  function swapProposalRecipes(sourceDate: string, targetDate: string) {
    if (sourceDate === targetDate) return
    setState((current) => {
      if (!current?.plan) return current
      const source = current.plan.proposals.find((proposal) => proposal.mealDate === sourceDate)
      const target = current.plan.proposals.find((proposal) => proposal.mealDate === targetDate)
      if (!source || !target) return current
      return {
        ...current,
        plan: {
          ...current.plan,
          proposals: current.plan.proposals.map((proposal) => {
            if (proposal.mealDate === sourceDate) return { ...proposal, recipe: target.recipe }
            if (proposal.mealDate === targetDate) return { ...proposal, recipe: source.recipe }
            return proposal
          }),
        },
      }
    })
  }

  function startProposalDrag(mealDate: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    proposalDrag.current = {
      active: false,
      sourceDate: mealDate,
      startX: event.clientX,
      startY: event.clientY,
      targetDate: mealDate,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function continueProposalDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const details = proposalDrag.current
    if (!details) return
    const distance = Math.hypot(event.clientX - details.startX, event.clientY - details.startY)
    if (!details.active && distance < 8) return
    details.active = true
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-proposal-date]')
    if (target?.dataset.proposalDate) details.targetDate = target.dataset.proposalDate
    setDraggingDate(details.sourceDate)
    setDropTargetDate(details.targetDate)
  }

  function finishProposalDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const details = proposalDrag.current
    proposalDrag.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDraggingDate(null)
    setDropTargetDate(null)
    if (details?.active) swapProposalRecipes(details.sourceDate, details.targetDate)
  }

  function moveProposalWithKeyboard(
    mealDate: string,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    const proposals = state?.plan?.proposals ?? []
    const sourceIndex = proposals.findIndex((proposal) => proposal.mealDate === mealDate)
    const target = proposals[sourceIndex + (event.key === 'ArrowUp' ? -1 : 1)]
    if (!target) return
    event.preventDefault()
    swapProposalRecipes(mealDate, target.mealDate)
  }

  function removeProposal(mealDate: string) {
    setState((current) => {
      if (!current?.plan) return current
      return {
        ...current,
        plan: {
          ...current.plan,
          proposals: current.plan.proposals.filter((proposal) => proposal.mealDate !== mealDate),
          unfilledDates: [...current.plan.unfilledDates, mealDate].sort(),
        },
      }
    })
  }

  async function reconcileShopping(meal: PlannedMeal, recipe: Recipe) {
    if (!householdId || !shopping.createFromPlan) return
    const additions = buildPlanAdditions([generationMeal(meal, recipe)], [recipe], []).additions
    await shopping.createFromPlan(householdId, meal.id, additions)
  }

  async function applyPlan() {
    if (!householdId || !state?.plan || applying || state.plan.proposals.length === 0) return
    setApplying(true)
    setState((current) => (current ? { ...current, error: null } : current))
    try {
      let currentMeals = await plannedMeals.listWeek(
        householdId,
        state.weekStart,
        addDays(state.weekStart, 6),
      )
      if (state.replace) {
        for (const meal of currentMeals.filter((candidate) => candidate.mealType === 'dinner')) {
          await plannedMeals.remove(meal.id)
        }
        currentMeals = []
      }

      for (const proposal of state.plan.proposals) {
        const existing = currentMeals.find(
          (meal) => meal.mealType === 'dinner' && meal.mealDate === proposal.mealDate,
        )
        if (existing) {
          if (existing.recipeId === proposal.recipe.id) {
            await reconcileShopping(existing, proposal.recipe)
          }
          continue
        }
        const source = recipeSourceForPlan(proposal.recipe)
        const saved = await plannedMeals.create(householdId, {
          mealDate: proposal.mealDate,
          mealType: 'dinner',
          title: proposal.recipe.name,
          notes: null,
          recipeId: proposal.recipe.id,
          recipeSource: source,
        })
        currentMeals.push(generationMeal(saved, proposal.recipe))
        await reconcileShopping(saved, proposal.recipe)
      }
      await onApplied?.()
      setState((current) => (current ? { ...current, phase: 'success' } : current))
    } catch (error) {
      setState((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : 'Cooksmith could not apply that plan. Try again safely.',
            }
          : current,
      )
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => void load(targetWeek)}>
        Plan my week
      </Button>
      {state ? (
        <Dialog
          open
          title={state.phase === 'success' ? 'Your week is planned' : 'Plan my week'}
          description={formatWeekRange(state.weekStart)}
          onOpenChange={(open) => {
            if (!open && !applying) setState(null)
          }}
        >
          {state.phase === 'loading' ? <p role="status">Preparing your week…</p> : null}

          {state.phase === 'choice' ? (
            <div className="week-plan-dialog">
              <p>This week is already planned. What would you like to do?</p>
              <div className="dialog-actions">
                <Button type="button" onClick={() => void load(nextWeek(state.weekStart))}>
                  Plan next week
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setState({ ...state, phase: 'confirm-replace' })}
                >
                  Replace this week
                </Button>
                <Button type="button" variant="quiet" onClick={() => setState(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {state.phase === 'confirm-replace' ? (
            <div className="week-plan-dialog">
              <p>
                Replace every dinner in this week? Existing dinners will be removed only after you
                review and apply the replacement.
              </p>
              <div className="dialog-actions">
                <Button type="button" onClick={prepareReplacement}>
                  Review replacement
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setState({ ...state, phase: 'choice' })}
                >
                  Keep this week
                </Button>
              </div>
            </div>
          ) : null}

          {state.phase === 'review' ? (
            <div className="week-plan-dialog">
              {state.replace ? (
                <p>
                  Review the replacement below. Applying it removes the existing dinners shown for
                  this week.
                </p>
              ) : null}

              {state.plan?.preservedMeals.length ? (
                <section aria-labelledby="preserved-meals-heading">
                  <h3 id="preserved-meals-heading">Already planned</h3>
                  <ul>
                    {state.plan.preservedMeals.map((meal) => (
                      <li key={meal.id}>
                        {formatDisplayDate(meal.mealDate)}: {meal.title}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {state.plan?.replacedMeals.length ? (
                <section aria-labelledby="replaced-meals-heading">
                  <h3 id="replaced-meals-heading">Dinners to be replaced</h3>
                  <ul>
                    {state.plan.replacedMeals.map((meal) => (
                      <li key={meal.id}>
                        {formatDisplayDate(meal.mealDate)}: {meal.title}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {state.plan?.proposals.length ? (
                <section aria-labelledby="proposed-meals-heading">
                  <h3 id="proposed-meals-heading">Proposed dinners</h3>
                  <p className="visually-hidden" id="week-plan-drag-instructions">
                    Drag the handle to swap dinners between days. With the handle focused, press Alt
                    with the up or down arrow.
                  </p>
                  <div className="week-plan-proposals">
                    {state.plan.proposals.map((proposal: WeekMealProposal) => (
                      <div
                        className={[
                          'week-plan-proposal',
                          draggingDate === proposal.mealDate ? 'dragging' : '',
                          dropTargetDate === proposal.mealDate ? 'drop-target' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        data-proposal-date={proposal.mealDate}
                        key={proposal.mealDate}
                      >
                        <button
                          className="week-plan-drag-handle"
                          type="button"
                          aria-describedby="week-plan-drag-instructions"
                          aria-label={`Move dinner for ${formatDisplayDate(proposal.mealDate)}`}
                          onKeyDown={(event) => moveProposalWithKeyboard(proposal.mealDate, event)}
                          onPointerDown={(event) => startProposalDrag(proposal.mealDate, event)}
                          onPointerMove={continueProposalDrag}
                          onPointerUp={finishProposalDrag}
                          onPointerCancel={finishProposalDrag}
                        ></button>
                        <RecipeSearchField
                          key={`${proposal.mealDate}-${proposal.recipe.id}`}
                          label={formatDisplayDate(proposal.mealDate)}
                          recipe={proposal.recipe}
                          recipes={state.recipes}
                          onSelect={(recipeId) => changeProposal(proposal.mealDate, recipeId)}
                        />
                        <div className="week-plan-proposal-actions">
                          <IconButton
                            aria-label={`Replace dinner for ${formatDisplayDate(proposal.mealDate)} with a random recipe`}
                            onClick={() => replaceProposal(proposal.mealDate)}
                          >
                            <RefreshCw aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            aria-label={`Remove dinner for ${formatDisplayDate(proposal.mealDate)}`}
                            onClick={() => removeProposal(proposal.mealDate)}
                          >
                            <X aria-hidden="true" />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {state.plan?.unfilledDates.length ? (
                <p>
                  No permitted recipe is available for{' '}
                  {state.plan.unfilledDates.map(formatDisplayDate).join(', ')}. Those days will stay
                  empty.
                </p>
              ) : null}
              {!state.plan && !state.error ? <p>Cooksmith could not prepare a proposal.</p> : null}
              {state.error ? (
                <p className="form-error" role="alert">
                  {state.error}
                </p>
              ) : null}
              <div className="dialog-actions">
                <Button
                  type="button"
                  busy={applying}
                  busyLabel="Applying plan"
                  disabled={!state.plan?.proposals.length}
                  onClick={() => void applyPlan()}
                >
                  Apply plan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={applying}
                  onClick={() => setState(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {state.phase === 'success' ? (
            <div className="week-plan-dialog">
              <p>Your reviewed dinners are now in Plan and Shopping has been reconciled.</p>
              <div className="dialog-actions">
                <Button type="button" onClick={() => setState(null)}>
                  Done
                </Button>
              </div>
            </div>
          ) : null}
        </Dialog>
      ) : null}
    </>
  )
}
