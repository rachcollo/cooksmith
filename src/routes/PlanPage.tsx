import { MealCompletionAction } from './meal-plans/MealCompletionAction'
import { useFreezerRepository } from '../app/freezer/freezerContext'
import type { FreezerMeal } from '../domain/freezer/types'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  X,
} from 'lucide-react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { useShoppingRepository } from '../app/shopping/shoppingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { LoadingState } from '../components/ui/LoadingState'
import { Tag } from '../components/ui/Tag'
import { TextArea } from '../components/ui/TextArea'
import { TextField } from '../components/ui/TextField'
import {
  displayTitleForPlannedMeal,
  snapshotTitleForRecipe,
} from '../domain/meal-plans/recipeLinks'
import { randomReplacementRecipe, recipeSourceForPlan } from '../domain/meal-plans/weekGeneration'
import type { PlannedMeal, PlannedMealInput } from '../domain/meal-plans/types'
import { plannedMealInputSchema } from '../domain/meal-plans/validationSchemas'
import {
  addDays,
  currentWeek,
  formatDayLabel,
  formatDisplayDate,
  formatWeekRange,
  nextWeek,
  previousWeek,
  toLocalIsoDate,
  weekDays,
} from '../domain/meal-plans/week'
import { recipeToMultilineInput, splitMeaningfulLines } from '../domain/recipes/multilineContent'
import type { Recipe } from '../domain/recipes/types'
import { buildPlanAdditions } from '../domain/shopping/planGeneration'
import { MealSearchField } from './meal-plans/MealSearchField'
import { WeekPlanGenerator } from './meal-plans/WeekPlanGenerator'
import '../styles/mealPlannerLinkedCards.css'

type MealDialog =
  | { mode: 'add'; input: PlannedMealInput }
  | { mode: 'edit'; meal: PlannedMeal; input: PlannedMealInput }
type MealFieldErrors = Partial<Record<'mealDate' | 'title' | 'notes' | 'recipeId', string>>
type DragDetails = {
  meal: PlannedMeal
  startX: number
  startY: number
  targetDate: string
  active: boolean
}

function inputFor(mealDate: string): PlannedMealInput {
  return {
    mealDate,
    mealType: 'dinner',
    title: '',
    notes: null,
    recipeId: null,
    recipeSource: null,
  }
}

function compactDate(isoDate: string) {
  return formatDisplayDate(isoDate).replace(/\s+\d{4}$/, '')
}

function recipeMinutesLabel(recipe: Recipe) {
  const total = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  return total > 0 ? `${total} min total` : null
}

function plannedMealWithRecipe(saved: PlannedMeal, recipe: Recipe): PlannedMeal {
  const linkedRecipe = { id: recipe.id, name: recipe.name, archivedAt: recipe.archivedAt }
  return {
    ...saved,
    recipeId: recipe.id,
    recipeSource: recipeSourceForPlan(recipe),
    linkedRecipe,
    recipeState: { kind: 'active', recipe: linkedRecipe },
  }
}

export function PlanPage() {
  const { state } = useOnboarding()
  return <HouseholdPlanPage key={state.householdId ?? 'no-household'} />
}

function HouseholdPlanPage() {
  const { state } = useOnboarding()
  const repository = usePlannedMealRepository()
  const recipeRepository = useRecipeRepository()
  const shoppingRepository = useShoppingRepository()
  const householdId = state.householdId
  const today = toLocalIsoDate(new Date())
  const thisWeek = currentWeek(new Date())
  const [weekStart, setWeekStart] = useState(thisWeek)
  const [meals, setMeals] = useState<PlannedMeal[]>([])
  const freezerRepository = useFreezerRepository()
  const [freezerMeals, setFreezerMeals] = useState<FreezerMeal[]>([])
  const [freezerError, setFreezerError] = useState<string | null>(null)
  const [selectedFreezer, setSelectedFreezer] = useState<FreezerMeal | null>(null)
  const [freezerPortions, setFreezerPortions] = useState(1)
  const freezerAttempt = useRef<{ operationId: string; planId: string; key: string } | null>(null)
  const freezerActions = useRef(new Set<string>())
  const freezerOperations = useRef(new Map<string, string>())
  const [freezerBusy, setFreezerBusy] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [dialog, setDialog] = useState<MealDialog | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<MealFieldErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [replacingMealId, setReplacingMealId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [choiceConfirmed, setChoiceConfirmed] = useState(false)
  const submitLock = useRef(false)
  const retryMeal = useRef<PlannedMeal | null>(null)
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [draggingMealId, setDraggingMealId] = useState<string | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  const dragDetails = useRef<DragDetails | null>(null)
  const suppressMealClick = useRef(false)
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const visibleMeals = useMemo(
    () => meals.filter((meal) => meal.householdId === householdId && meal.mealType === 'dinner'),
    [householdId, meals],
  )
  const weekEnd = addDays(weekStart, 6)
  const activeWeek = useRef('')
  useEffect(() => {
    activeWeek.current = `${householdId}:${weekStart}`
    return () => {
      activeWeek.current = ''
    }
  }, [householdId, weekStart])
  const activeRecipes = useMemo(() => recipes.filter((recipe) => !recipe.archivedAt), [recipes])
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null

  useEffect(() => {
    let active = true
    if (!householdId) return
    repository
      .listWeek(householdId, weekStart, weekEnd)
      .then((next) => {
        if (active) {
          setMeals(next)
          setError(null)
        }
      })
      .catch(() => {
        if (active) setError('We could not load this week’s dinners. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, repository, weekEnd, weekStart])

  useEffect(() => {
    let active = true
    if (!householdId) return
    recipeRepository
      .list(householdId)
      .then((next) => {
        if (active) {
          setRecipes(next.filter((recipe) => !recipe.archivedAt))
          setRecipeError(null)
        }
      })
      .catch(() => {
        if (active) setRecipeError('Recipe search is unavailable. You can still add a manual meal.')
      })
      .finally(() => {
        if (active) setRecipesLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, recipeRepository])

  useEffect(() => {
    let active = true
    if (!householdId || !freezerRepository) return
    void freezerRepository
      .list(householdId)
      .then((next) => {
        if (active) {
          setFreezerMeals(next)
          setFreezerError(null)
        }
      })
      .catch(() => {
        if (active)
          setFreezerError('Freezer stock is unavailable. Refresh stock in Pantry before reserving.')
      })
    return () => {
      active = false
    }
  }, [householdId, freezerRepository])

  async function refreshFreezer() {
    if (householdId && freezerRepository) {
      setFreezerMeals(await freezerRepository.list(householdId))
      setFreezerError(null)
    }
  }
  async function changeFreezerUsage(meal: PlannedMeal) {
    if (
      !householdId ||
      !freezerRepository ||
      !meal.freezerMealId ||
      freezerActions.current.has(meal.id)
    )
      return
    const consumed = meal.freezerState === 'consumed'
    if (
      !window.confirm(
        consumed
          ? `Return ${meal.freezerPortions} portions to the freezer and reserve them for this dinner?`
          : `Mark ${meal.freezerPortions} portions of ${meal.title} as used?`,
      )
    )
      return
    const operationKey = `${meal.id}:${consumed ? 'undo' : 'consume'}`
    const operationId = freezerOperations.current.get(operationKey) ?? crypto.randomUUID()
    freezerOperations.current.set(operationKey, operationId)
    freezerActions.current.add(meal.id)
    setFreezerBusy(meal.id)
    try {
      await freezerRepository.command(householdId, {
        operationId,
        action: consumed ? 'undo' : 'consume',
        freezerId: meal.freezerMealId,
        planId: meal.id,
        payload: {},
      })
      setMeals(await repository.listWeek(householdId, weekStart, weekEnd))
      await refreshFreezer()
      freezerOperations.current.delete(operationKey)
      setError(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not update freezer stock. Refresh to check before retrying.',
      )
    } finally {
      freezerActions.current.delete(meal.id)
      setFreezerBusy(null)
    }
  }

  function validate(input: PlannedMealInput): PlannedMealInput | null {
    const result = plannedMealInputSchema.safeParse(input)
    if (result.success) {
      setFieldErrors({})
      return result.data
    }
    const nextErrors: MealFieldErrors = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0]
      if (
        (key === 'mealDate' || key === 'title' || key === 'notes' || key === 'recipeId') &&
        !(key in nextErrors)
      ) {
        nextErrors[key] = issue.message
      }
    }
    setFieldErrors(nextErrors)
    return null
  }

  function openAdd(mealDate: string) {
    setSelectedFreezer(null)
    setFreezerPortions(1)
    freezerAttempt.current = null
    void refreshFreezer().catch(() =>
      setFreezerError('Could not refresh freezer stock. Reservations will be checked when saved.'),
    )
    retryMeal.current = null
    setChoiceConfirmed(false)
    setDialog({ mode: 'add', input: inputFor(mealDate) })
    setFieldErrors({})
    setFormError(null)
  }

  function openEdit(meal: PlannedMeal) {
    setSelectedFreezer(null)
    freezerAttempt.current = null
    retryMeal.current = null
    setChoiceConfirmed(true)
    setDialog({
      mode: 'edit',
      meal,
      input: {
        mealDate: meal.mealDate,
        mealType: 'dinner',
        title: meal.title,
        notes: meal.notes,
        recipeId: meal.recipeId,
        recipeSource: meal.recipeSource,
      },
    })
    setFieldErrors({})
    setFormError(null)
  }

  function selectRecipe(recipe: Recipe) {
    setSelectedFreezer(null)
    freezerAttempt.current = null
    if (!dialog || !activeRecipes.includes(recipe)) return
    setChoiceConfirmed(true)
    updateDialog({
      ...dialog.input,
      recipeId: recipe.id,
      recipeSource: recipeSourceForPlan(recipe),
      title: snapshotTitleForRecipe(recipe),
    })
  }

  function updateDialog(input: PlannedMealInput) {
    if (!dialog) return
    setDialog(
      dialog.mode === 'add' ? { mode: 'add', input } : { mode: 'edit', meal: dialog.meal, input },
    )
  }

  function openPlannedMeal(meal: PlannedMeal) {
    if (suppressMealClick.current) {
      suppressMealClick.current = false
      return
    }
    if (meal.recipeState.kind === 'active') {
      setSelectedRecipeId(meal.recipeState.recipe.id)
      return
    }
    openEdit(meal)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog || !householdId || submitLock.current || !choiceConfirmed) return
    const input = validate(dialog.input)
    if (!input) {
      setFormError('Check the highlighted dinner details.')
      return
    }
    submitLock.current = true
    setSaving(true)
    setFormError(null)
    try {
      let saved: PlannedMeal
      if (selectedFreezer && freezerRepository) {
        if (
          !Number.isInteger(freezerPortions) ||
          freezerPortions < 1 ||
          freezerPortions > selectedFreezer.available
        )
          throw new Error('Choose whole portions within the available stock.')
        const key = JSON.stringify({ id: selectedFreezer.id, portions: freezerPortions, input })
        if (freezerAttempt.current?.key !== key)
          freezerAttempt.current = {
            key,
            operationId: crypto.randomUUID(),
            planId:
              freezerAttempt.current?.planId ??
              (dialog.mode === 'edit' ? dialog.meal.id : crypto.randomUUID()),
          }
        const attempt = freezerAttempt.current
        await freezerRepository.command(householdId, {
          operationId: attempt.operationId,
          action: 'reserve',
          freezerId: selectedFreezer.id,
          planId: attempt.planId,
          payload: { portions: freezerPortions, mealDate: input.mealDate, notes: input.notes },
        })
        const persisted = (
          await repository.listWeek(householdId, input.mealDate, input.mealDate)
        ).find((meal) => meal.id === attempt.planId)
        if (!persisted)
          throw new Error('Reservation may have saved. Retry unchanged or refresh Plan to recover.')
        saved = persisted
      } else {
        saved =
          dialog.mode === 'add'
            ? retryMeal.current
              ? await repository.update(retryMeal.current.id, input)
              : await repository.create(householdId, input)
            : await repository.update(dialog.meal.id, input)
      }

      if (dialog.mode === 'add') retryMeal.current = saved
      if (saved.freezerMealId) {
        await refreshFreezer()
      } else if (input.recipeId) {
        const linkedRecipe = recipes.find(
          (recipe) =>
            recipe.id === input.recipeId && recipeSourceForPlan(recipe) === input.recipeSource,
        )
        if (linkedRecipe) {
          const generationMeal: PlannedMeal = {
            ...saved,
            recipeId: linkedRecipe.id,
            recipeSource: input.recipeSource,
            linkedRecipe: {
              id: linkedRecipe.id,
              name: linkedRecipe.name,
              archivedAt: linkedRecipe.archivedAt,
            },
            recipeState: {
              kind: 'active',
              recipe: {
                id: linkedRecipe.id,
                name: linkedRecipe.name,
                archivedAt: linkedRecipe.archivedAt,
              },
            },
          }
          const additions = buildPlanAdditions([generationMeal], [linkedRecipe], []).additions
          await shoppingRepository.createFromPlan?.(householdId, saved.id, additions)
        }
      } else {
        await shoppingRepository.createFromPlan?.(householdId, saved.id, [])
      }

      setMeals((current) =>
        dialog.mode === 'add'
          ? [...current, saved]
          : current.map((meal) => (meal.id === saved.id ? saved : meal)),
      )
      setDialog(null)
    } catch (saveError) {
      setFormError(
        saveError instanceof Error ? saveError.message : 'Cooksmith could not save that dinner.',
      )
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  async function remove(meal: PlannedMeal) {
    const explanation = meal.freezerMealId
      ? meal.freezerState === 'consumed'
        ? ' Already-used portions will not be returned. Undo use first if needed.'
        : ' Reserved portions will become available again.'
      : ''
    if (!window.confirm(`Remove ${displayTitleForPlannedMeal(meal)} from the plan?${explanation}`))
      return
    try {
      await repository.remove(meal.id)
      if (meal.freezerMealId) await refreshFreezer()
      setMeals((current) => current.filter((candidate) => candidate.id !== meal.id))
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith could not remove that dinner.',
      )
    }
  }

  async function replaceMeal(meal: PlannedMeal) {
    if (meal.freezerMealId) return
    if (!householdId || replacingMealId) return
    const recipe = randomReplacementRecipe(activeRecipes, meal.recipeId)
    if (!recipe) {
      setError('Add another recipe before replacing this dinner.')
      return
    }
    setReplacingMealId(meal.id)
    try {
      const saved = await repository.update(meal.id, {
        mealDate: meal.mealDate,
        mealType: 'dinner',
        title: snapshotTitleForRecipe(recipe),
        notes: meal.notes,
        recipeId: recipe.id,
        recipeSource: recipeSourceForPlan(recipe),
      })
      const replacement = plannedMealWithRecipe(saved, recipe)
      const additions = buildPlanAdditions([replacement], [recipe], []).additions
      await shoppingRepository.createFromPlan?.(householdId, saved.id, additions)
      setMeals((current) =>
        current.map((candidate) => (candidate.id === meal.id ? replacement : candidate)),
      )
      setError(null)
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : 'Cooksmith could not replace that dinner.',
      )
    } finally {
      setReplacingMealId(null)
    }
  }

  async function moveMeal(meal: PlannedMeal, targetDate: string) {
    if (meal.mealDate === targetDate) return
    const displaced = visibleMeals.find(
      (candidate) => candidate.mealDate === targetDate && candidate.id !== meal.id,
    )
    try {
      const [moved, swapped] = await Promise.all([
        repository.update(meal.id, { ...meal, mealDate: targetDate }),
        displaced
          ? repository.update(displaced.id, {
              ...displaced,
              mealDate: meal.mealDate,
            })
          : Promise.resolve(null),
      ])
      setMeals((current) =>
        current.map((candidate) => {
          if (candidate.id === moved.id) return moved
          if (swapped && candidate.id === swapped.id) return swapped
          return candidate
        }),
      )
      setError(null)
    } catch (moveError) {
      setError(
        moveError instanceof Error ? moveError.message : 'Cooksmith could not move that dinner.',
      )
    }
  }

  function startDrag(meal: PlannedMeal, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    // A stock review is rendered inside the card; its controls must not capture a drag.
    if (event.target instanceof Element && event.target.closest('dialog')) return
    dragDetails.current = {
      meal,
      startX: event.clientX,
      startY: event.clientY,
      targetDate: meal.mealDate,
      active: false,
    }
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function continueDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const details = dragDetails.current
    if (!details) return
    const distance = Math.hypot(event.clientX - details.startX, event.clientY - details.startY)
    if (!details.active && distance < 8) return
    details.active = true
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-meal-date]')
    if (target?.dataset.mealDate) details.targetDate = target.dataset.mealDate
    setDraggingMealId(details.meal.id)
    setDropTargetDate(details.targetDate)
  }

  function moveWithKeyboard(meal: PlannedMeal, event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    const targetDate = addDays(meal.mealDate, event.key === 'ArrowLeft' ? -1 : 1)
    if (!days.includes(targetDate)) return
    event.preventDefault()
    void moveMeal(meal, targetDate)
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const details = dragDetails.current
    dragDetails.current = null
    if (
      typeof event.currentTarget.hasPointerCapture === 'function' &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDraggingMealId(null)
    setDropTargetDate(null)
    if (details?.active) {
      suppressMealClick.current = true
      void moveMeal(details.meal, details.targetDate)
    }
  }

  return (
    <div className="page-stack meal-planner-page">
      <DocumentTitle title="Meal Planner" />
      <header className="page-header meal-planner-header">
        <h1>Seven days. Let’s not overthink it.</h1>
        <p>Plan the dinners that help. Leave the rest blank.</p>
        <WeekPlanGenerator
          householdId={householdId}
          targetWeek={weekStart}
          onApplied={async () => {
            if (!householdId) return
            setMeals(await repository.listWeek(householdId, weekStart, weekEnd))
          }}
        />
      </header>

      <div className="meal-week-toolbar" aria-label="Week navigation">
        <Button
          variant="quiet"
          type="button"
          aria-label="Previous week"
          onClick={() => setWeekStart(previousWeek(weekStart))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div>
          <strong>{formatWeekRange(weekStart)}</strong>
          {weekStart !== thisWeek ? (
            <button type="button" onClick={() => setWeekStart(thisWeek)}>
              Back to this week
            </button>
          ) : null}
        </div>
        <Button
          variant="quiet"
          type="button"
          aria-label="Next week"
          onClick={() => setWeekStart(nextWeek(weekStart))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <p className="meal-planner-error" role="alert">
          {error}
        </p>
      ) : null}

      <span className="meal-drag-instructions" id="meal-drag-instructions">
        To move a dinner without dragging, focus its name and press Alt with the left or right
        arrow.
      </span>

      {completionMessage ? <p role="status">{completionMessage}</p> : null}
      {loading ? (
        <LoadingState label="Loading this week’s dinners" />
      ) : (
        <section className="meal-week" aria-label="Weekly dinner planner">
          {days.map((day) => {
            const meal = visibleMeals.find((candidate) => candidate.mealDate === day)
            const mealRecipe = meal?.recipeId
              ? recipes.find((recipe) => recipe.id === meal.recipeId)
              : null
            return (
              <article
                className={[
                  'meal-day',
                  day === today ? 'meal-day-today' : '',
                  day === dropTargetDate ? 'meal-day-drop-target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={day}
                data-meal-date={day}
                aria-labelledby={`meal-day-${day}`}
              >
                <header className="meal-day-heading">
                  <div>
                    <p>{formatDayLabel(day)}</p>
                    <h2 id={`meal-day-${day}`}>{compactDate(day)}</h2>
                  </div>
                  {day === today ? <span className="meal-today-badge">Today</span> : null}
                </header>

                {meal ? (
                  <div
                    className={`planned-meal${mealRecipe?.imageUrl ? ' has-photo' : ''}${draggingMealId === meal.id ? ' dragging' : ''}`}
                    onPointerDown={(event) => startDrag(meal, event)}
                    onPointerMove={continueDrag}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                  >
                    <GripVertical aria-hidden="true" className="meal-drag-handle" />
                    {mealRecipe?.imageUrl ? (
                      <span className="photo-frame meal-plan-photo" aria-hidden="true">
                        <span className="photo-frame-backdrop" />
                        <img className="photo-frame-media" src={mealRecipe.imageUrl} alt="" />
                      </span>
                    ) : null}
                    <button
                      className="planned-meal-title"
                      aria-label={displayTitleForPlannedMeal(meal)}
                      type="button"
                      aria-describedby={
                        meal.recipeState.kind === 'free-text'
                          ? `meal-drag-instructions manual-${meal.id}`
                          : 'meal-drag-instructions'
                      }
                      onKeyDown={(event) => moveWithKeyboard(meal, event)}
                      onClick={() => openPlannedMeal(meal)}
                    >
                      <strong>{displayTitleForPlannedMeal(meal)}</strong>
                      {meal.recipeState.kind !== 'free-text' ? (
                        <span className="meal-recipe-status">
                          <BookOpen aria-hidden="true" />
                          {meal.recipeState.kind === 'archived'
                            ? 'Archived recipe'
                            : meal.recipeState.kind === 'unavailable'
                              ? `Recipe unavailable — ${meal.title}`
                              : 'Recipe'}
                        </span>
                      ) : (
                        <span
                          id={`manual-${meal.id}`}
                          className="meal-recipe-status manual-meal-status"
                        >
                          {meal.freezerMealId
                            ? `Freezer · ${meal.freezerPortions} portions ${meal.freezerState === 'consumed' ? 'used' : 'reserved'}`
                            : 'Manual meal'}
                        </span>
                      )}
                      {meal.notes ? <span>{meal.notes}</span> : null}
                    </button>
                    <div className="planned-meal-actions">
                      {repository.complete ? (
                        <MealCompletionAction
                          meal={meal}
                          onStatus={setCompletionMessage}
                          recipe={mealRecipe ?? null}
                          onChanged={async () => {
                            if (!householdId) return
                            const key = `${householdId}:${weekStart}`
                            const current = await repository.listWeek(
                              householdId,
                              weekStart,
                              weekEnd,
                            )
                            if (activeWeek.current !== key) return
                            setMeals(current)
                            await refreshFreezer()
                          }}
                        />
                      ) : null}
                      {meal.freezerMealId && freezerRepository && !repository.complete ? (
                        <Button
                          variant="quiet"
                          disabled={freezerBusy !== null}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => void changeFreezerUsage(meal)}
                          aria-label={`${meal.freezerState === 'consumed' ? 'Undo use' : 'Mark used'} ${meal.title}`}
                        >
                          {meal.freezerState === 'consumed' ? 'Undo use' : 'Mark used'}
                        </Button>
                      ) : null}
                      <details
                        className="planned-meal-more"
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.currentTarget.open = false
                            event.currentTarget.querySelector('summary')?.focus()
                          }
                        }}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest('button'))
                            event.currentTarget.open = false
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <summary aria-label={`More actions for ${meal.title}`}>
                          <MoreHorizontal aria-hidden="true" />
                        </summary>
                        <div className="planned-meal-menu">
                          {!meal.freezerMealId && !meal.completedAt ? (
                            <button
                              className="meal-remove"
                              type="button"
                              aria-label={`Replace ${displayTitleForPlannedMeal(meal)} with a random recipe`}
                              aria-busy={replacingMealId === meal.id}
                              disabled={replacingMealId !== null || Boolean(meal.freezerMealId)}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={() => void replaceMeal(meal)}
                            >
                              <RefreshCw aria-hidden="true" /> Replace
                            </button>
                          ) : null}
                          <button
                            className="meal-remove"
                            type="button"
                            aria-label={`Edit planned dinner ${displayTitleForPlannedMeal(meal)}`}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => openEdit(meal)}
                          >
                            <Pencil aria-hidden="true" /> Edit
                          </button>
                          <button
                            className="meal-remove"
                            type="button"
                            aria-label={`Remove ${displayTitleForPlannedMeal(meal)}`}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => void remove(meal)}
                          >
                            <X aria-hidden="true" /> Remove
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                ) : (
                  <Button
                    aria-label="Add dinner"
                    className="meal-empty-slot"
                    variant="secondary"
                    type="button"
                    onClick={() => openAdd(day)}
                  >
                    + Add dinner
                  </Button>
                )}
              </article>
            )
          })}
        </section>
      )}

      <aside className="meal-planner-permission">
        <span aria-hidden="true">🍕</span>
        <div>
          <strong>Plans change. That’s the plan.</strong>
          <p>Press and drag a dinner to move it to another day.</p>
        </div>
      </aside>

      {selectedRecipe ? (
        <Dialog
          open
          title={selectedRecipe.name}
          description={[
            recipeMinutesLabel(selectedRecipe),
            selectedRecipe.servings ? `${selectedRecipe.servings} servings` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          onOpenChange={(open) => {
            if (!open) setSelectedRecipeId(null)
          }}
        >
          <div className="recipe-detail-dialog">
            <div className="photo-frame recipe-detail-photo" aria-hidden="true">
              <span className="photo-frame-backdrop" />
              {selectedRecipe.imageUrl ? (
                <img className="photo-frame-media" src={selectedRecipe.imageUrl} alt="" />
              ) : (
                <span className="photo-frame-media is-empty" />
              )}
            </div>
            {selectedRecipe.tags.length > 0 ? (
              <div className="recipe-tags" aria-label="Recipe tags">
                {selectedRecipe.tags.map((tag) => (
                  <Tag key={tag} label={tag} />
                ))}
              </div>
            ) : null}
            <section>
              <h3>Ingredients</h3>
              {splitMeaningfulLines(recipeToMultilineInput(selectedRecipe).ingredients).length >
              0 ? (
                <ul>
                  {splitMeaningfulLines(recipeToMultilineInput(selectedRecipe).ingredients).map(
                    (line, index) => (
                      <li key={`${index}-${line}`}>{line}</li>
                    ),
                  )}
                </ul>
              ) : (
                <p>No ingredients added yet.</p>
              )}
            </section>
            <section>
              <h3>Instructions</h3>
              {splitMeaningfulLines(recipeToMultilineInput(selectedRecipe).description).length >
              0 ? (
                <ol>
                  {splitMeaningfulLines(recipeToMultilineInput(selectedRecipe).description).map(
                    (line, index) => (
                      <li key={`${index}-${line}`}>{line}</li>
                    ),
                  )}
                </ol>
              ) : (
                <p>No instructions added yet.</p>
              )}
            </section>
            <dl>
              <dt>Servings</dt>
              <dd>{selectedRecipe.servings ?? 'Not set'}</dd>
              <dt>Preparation time</dt>
              <dd>
                {selectedRecipe.prepTimeMinutes !== null
                  ? `${selectedRecipe.prepTimeMinutes} minutes`
                  : 'Not set'}
              </dd>
              <dt>Cooking time</dt>
              <dd>
                {selectedRecipe.cookTimeMinutes !== null
                  ? `${selectedRecipe.cookTimeMinutes} minutes`
                  : 'Not set'}
              </dd>
            </dl>
            {selectedRecipe.notes ? <p>Notes: {selectedRecipe.notes}</p> : null}
            {selectedRecipe.sourceUrl ? (
              <p>
                <a href={selectedRecipe.sourceUrl} target="_blank" rel="noreferrer">
                  Open source link
                </a>
              </p>
            ) : null}
            <div className="dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setSelectedRecipeId(null)}>
                Back to planner
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {dialog ? (
        <Dialog
          open
          title={dialog.mode === 'add' ? 'Add dinner' : `Edit ${dialog.meal.title}`}
          description={compactDate(dialog.input.mealDate)}
          onOpenChange={(open) => {
            if (!open && !saving) {
              setDialog(null)
              if (freezerAttempt.current && householdId)
                void repository
                  .listWeek(householdId, weekStart, weekEnd)
                  .then(setMeals)
                  .catch(() => setError('Refresh Plan to check whether the reservation was saved.'))
            }
          }}
        >
          <form className="pantry-form pantry-edit-form" onSubmit={(event) => void submit(event)}>
            <MealSearchField
              value={dialog.input.title}
              recipes={activeRecipes}
              freezerMeals={dialog.mode === 'add' || !dialog.meal.freezerMealId ? freezerMeals : []}
              onFreezer={(meal) => {
                setSelectedFreezer(meal)
                setFreezerPortions(1)
                setChoiceConfirmed(true)
                updateDialog({
                  ...dialog.input,
                  title: meal.name,
                  recipeId: null,
                  recipeSource: null,
                })
              }}
              loading={recipesLoading}
              error={recipeError}
              disabled={
                saving ||
                Boolean(freezerAttempt.current) ||
                (dialog.mode === 'edit' && Boolean(dialog.meal.freezerMealId))
              }
              onQuery={(title) => {
                setSelectedFreezer(null)
                freezerAttempt.current = null
                setChoiceConfirmed(false)
                updateDialog({ ...dialog.input, title, recipeId: null, recipeSource: null })
              }}
              onRecipe={selectRecipe}
              onManual={(title) => {
                setSelectedFreezer(null)
                freezerAttempt.current = null
                setChoiceConfirmed(true)
                updateDialog({ ...dialog.input, title, recipeId: null, recipeSource: null })
              }}
            />
            {freezerError ? <p role="status">{freezerError}</p> : null}
            {selectedFreezer ? (
              <TextField
                disabled={saving || Boolean(freezerAttempt.current)}
                label="Freezer portions"
                type="number"
                min={1}
                max={selectedFreezer.available}
                step={1}
                value={freezerPortions}
                onChange={(event) => setFreezerPortions(Number(event.target.value))}
                hint={`${selectedFreezer.available} available. Saving reserves these portions.`}
              />
            ) : null}
            {dialog.mode === 'edit' && dialog.meal.freezerMealId ? (
              <p>
                Move this reservation by changing the date. To choose another dinner, remove this
                entry first.
              </p>
            ) : null}
            {choiceConfirmed ? (
              <p className="form-hint">
                {selectedFreezer || (dialog.mode === 'edit' && dialog.meal.freezerMealId)
                  ? 'Prepared freezer meal. No ingredients will be added to Shopping.'
                  : dialog.input.recipeId
                    ? 'Recipe selected. Ingredients will be added to Shopping.'
                    : 'Manual meal — no recipe ingredients will be added.'}
              </p>
            ) : null}
            <TextField
              error={fieldErrors.mealDate}
              disabled={saving || Boolean(freezerAttempt.current)}
              label="Date"
              required
              type="date"
              value={dialog.input.mealDate}
              onChange={(event) => updateDialog({ ...dialog.input, mealDate: event.target.value })}
            />
            <TextArea
              error={fieldErrors.notes}
              disabled={saving || Boolean(freezerAttempt.current)}
              label="Notes"
              optional
              value={dialog.input.notes ?? ''}
              onChange={(event) => updateDialog({ ...dialog.input, notes: event.target.value })}
            />
            {fieldErrors.title ? (
              <p role="alert" className="form-error">
                {fieldErrors.title}
              </p>
            ) : null}
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setDialog(null)
                  if (freezerAttempt.current && householdId)
                    void repository
                      .listWeek(householdId, weekStart, weekEnd)
                      .then(setMeals)
                      .catch(() =>
                        setError('Refresh Plan to check whether the reservation was saved.'),
                      )
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                busy={saving}
                disabled={!choiceConfirmed || dialog.input.title.trim() === ''}
              >
                Save dinner
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  )
}
