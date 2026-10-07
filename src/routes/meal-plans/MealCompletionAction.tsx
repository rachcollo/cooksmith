import { useRecipeRepository } from '../../app/recipes/recipeContext'
import { Check, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePantryRepository } from '../../app/pantry/pantryContext'
import { usePlannedMealRepository } from '../../app/meal-plans/plannedMealContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { mealStockProposal, type MealStockLine } from '../../domain/meal-plans/completion'
import type { PlannedMeal } from '../../domain/meal-plans/types'
import type { Recipe } from '../../domain/recipes/types'

export function MealCompletionAction({
  meal,
  recipe,
  onChanged,
  onStatus,
}: {
  meal: PlannedMeal
  recipe: Recipe | null
  onChanged: () => Promise<void>
  onStatus: (message: string) => void
}) {
  const recipes = useRecipeRepository()
  const pantry = usePantryRepository()
  const repository = usePlannedMealRepository()
  const [busy, setBusy] = useState(false)
  const [review, setReview] = useState<{ lines: MealStockLine[]; checks: string[] } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (message) onStatus(message)
  }, [message, onStatus])
  const lock = useRef(false)
  const active = useRef(true)
  const attempt = useRef<{
    id: string
    lines: MealStockLine[]
    meal: PlannedMeal
    action: 'done' | 'undo'
  } | null>(null)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const done = Boolean(meal.completedAt)
  async function commit(lines: MealStockLine[]) {
    if (!repository.complete) return
    const command = attempt.current ?? {
      id: crypto.randomUUID(),
      lines,
      meal,
      action: done ? ('undo' as const) : ('done' as const),
    }
    attempt.current = command
    await repository.complete(
      meal.householdId,
      command.id,
      command.meal,
      command.action,
      command.lines,
    )
    attempt.current = null
    if (!active.current) return
    setReview(null)
    setMessage(command.action === 'done' ? 'Meal marked done.' : 'Meal restored.')
    try {
      await onChanged()
    } catch {
      if (active.current) setMessage('Saved. Refresh Plan to see the latest dinner and stock.')
    }
  }
  async function applyReview() {
    if (lock.current || !review) return
    lock.current = true
    setBusy(true)
    try {
      await commit(review.lines)
    } catch (error) {
      if (error && typeof error === 'object' && 'rejected' in error && error.rejected)
        attempt.current = null
      if (active.current)
        setMessage(
          error instanceof Error ? error.message : 'Could not confirm the change. Retry safely.',
        )
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  async function act() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setMessage(null)
    try {
      if (attempt.current) {
        await commit(attempt.current.lines)
        return
      }
      if (done) {
        const undo = await repository.undoReview!(
          meal.householdId,
          meal.id,
          meal.completionRevision ?? 0,
        )
        if (!active.current) return
        if (undo.changed)
          setReview({
            lines: undo.lines,
            checks: undo.lines
              .filter((line) => 'amount' in line)
              .map((line) => `${line.name}: return ${line.amount} ${line.unit}`),
          })
        else await commit(undo.lines)
      } else if (meal.freezerMealId) {
        const stock = await repository.freezerStock!(meal.householdId, meal.freezerMealId)
        if (!active.current) return
        await commit([
          {
            kind: 'freezer',
            freezerId: stock.id,
            revision: stock.revision,
            name: stock.name,
            unit: 'portion',
            amount: meal.freezerPortions ?? 1,
          },
        ])
      } else {
        const [items, purchases, latestRecipes] = await Promise.all([
          pantry.list(meal.householdId),
          repository.pendingStock?.(meal.householdId) ?? Promise.resolve([]),
          meal.recipeId ? recipes.list(meal.householdId) : Promise.resolve([]),
        ])
        if (!active.current) return
        const currentRecipe =
          latestRecipes.find((r) => r.id === meal.recipeId) ?? (meal.recipeId ? null : recipe)
        const proposal = mealStockProposal(currentRecipe, items, purchases)
        if (currentRecipe)
          proposal.lines.push({
            kind: 'recipe',
            recipeId: currentRecipe.id,
            updatedAt: currentRecipe.updatedAt,
          })
        if (meal.recipeId && !currentRecipe) {
          proposal.lines.push({ kind: 'untracked', name: meal.title })
          proposal.checks.push('Recipe unavailable')
        }
        await commit(proposal.lines)
        if (active.current && proposal.checks.length)
          setMessage(
            `Meal done. Amounts untracked for ${proposal.checks.join(', ')}. Adjust Pantry only if useful.`,
          )
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'rejected' in error && error.rejected)
        attempt.current = null
      if (active.current)
        setMessage(
          error instanceof Error ? error.message : 'Could not check this dinner. Try again.',
        )
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  if (!repository.complete) return null
  return (
    <>
      <button
        className="meal-remove"
        type="button"
        aria-label={`${done ? 'Undo done' : 'Mark done'} ${meal.title}`}
        aria-pressed={done}
        disabled={busy}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => void act()}
      >
        {done ? <Undo2 aria-hidden="true" /> : <Check aria-hidden="true" />}
      </button>
      {review ? (
        <Dialog
          open
          title={done ? 'Check the stock being returned' : 'A few amounts are untracked'}
          description={
            done
              ? 'Pantry changed since this dinner. Undo adds back only the recorded amounts.'
              : 'Cooksmith can mark dinner done and update known amounts. These items will stay unchanged; you can adjust them in Pantry whenever useful.'
          }
          onOpenChange={(open) => {
            if (!open && !busy) setReview(null)
          }}
        >
          <ul>
            {review.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          {message ? <p role="status">{message}</p> : null}
          <div className="dialog-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setReview(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void applyReview()}>
              {done ? 'Undo dinner' : 'Mark dinner done'}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  )
}
