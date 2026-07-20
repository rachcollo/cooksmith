import { useState } from 'react'

import { usePlannedMealRepository } from '../../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../../app/recipes/recipeContext'
import { useShoppingRepository } from '../../app/shopping/shoppingContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import {
  proposeWeekMeals,
  recipeSourceForPlan,
  type WeekMealProposal,
  type WeekPlanProposal,
} from '../../domain/meal-plans/weekGeneration'
import type { PlannedMeal } from '../../domain/meal-plans/types'
import { addDays, formatDisplayDate, formatWeekRange, nextWeek } from '../../domain/meal-plans/week'
import type { Recipe } from '../../domain/recipes/types'
import { buildPlanAdditions } from '../../domain/shopping/planGeneration'

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
              ) : (
                <p>Existing dinners stay as they are. Cooksmith will fill only the empty days.</p>
              )}

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
                  <div className="week-plan-proposals">
                    {state.plan.proposals.map((proposal: WeekMealProposal) => {
                      const usedRecipeIds = new Set(
                        state.plan?.proposals
                          .filter((candidate) => candidate.mealDate !== proposal.mealDate)
                          .map((candidate) => candidate.recipe.id),
                      )
                      return (
                        <div className="week-plan-proposal" key={proposal.mealDate}>
                          <label>
                            <span>{formatDisplayDate(proposal.mealDate)}</span>
                            <select
                              aria-label={`Recipe for ${formatDisplayDate(proposal.mealDate)}`}
                              value={proposal.recipe.id}
                              onChange={(event) =>
                                changeProposal(proposal.mealDate, event.target.value)
                              }
                            >
                              {state.recipes.map((recipe) => (
                                <option
                                  key={recipe.id}
                                  value={recipe.id}
                                  disabled={usedRecipeIds.has(recipe.id)}
                                >
                                  {recipe.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button
                            type="button"
                            variant="quiet"
                            aria-label={`Remove proposal for ${formatDisplayDate(proposal.mealDate)}`}
                            onClick={() => removeProposal(proposal.mealDate)}
                          >
                            Remove
                          </Button>
                        </div>
                      )
                    })}
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
