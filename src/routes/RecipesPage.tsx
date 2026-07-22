import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { useShoppingRepository } from '../app/shopping/shoppingContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { TextArea } from '../components/ui/TextArea'
import { TextField } from '../components/ui/TextField'
import { VisuallyHidden } from '../components/ui/VisuallyHidden'
import {
  prepareMultilineRecipeInput,
  recipeToMultilineInput,
  splitMeaningfulLines,
} from '../domain/recipes/multilineContent'
import type {
  ImportedRecipeVisibility,
  Recipe,
  RecipeImportDraft,
  RecipeInput,
} from '../domain/recipes/types'
import { recipeInputSchema } from '../domain/recipes/validationSchemas'
import { snapshotTitleForRecipe } from '../domain/meal-plans/recipeLinks'
import type { PlannedMeal } from '../domain/meal-plans/types'
import { nextEmptyPlanDate, quickAddSearchWindowDays } from '../domain/meal-plans/quickAdd'
import { addDays, currentWeek, formatDisplayDate } from '../domain/meal-plans/week'
import { recipeSourceForPlan } from '../domain/meal-plans/weekGeneration'
import { buildPlanAdditions } from '../domain/shopping/planGeneration'
import { WeekPlanGenerator } from './meal-plans/WeekPlanGenerator'

const emptyInput: RecipeInput = {
  name: '',
  ingredients: null,
  description: null,
  sourceNote: null,
  sourceUrl: null,
  authorName: null,
  publisherName: null,
  servings: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  imageUrl: null,
  notes: null,
  category: null,
  tags: [],
  favourite: false,
  ingredientRows: [],
  steps: [],
}

type RecipeFieldErrors = Partial<Record<keyof RecipeInput | 'form', string>>

function minutesLabel(recipe: Recipe) {
  const total = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  return total > 0 ? `${total} min total` : null
}

function prepareInput(input: RecipeInput): RecipeInput {
  return prepareMultilineRecipeInput(input)
}

function recipesEqual(left: RecipeInput, right: RecipeInput): boolean {
  return JSON.stringify(prepareInput(left)) === JSON.stringify(prepareInput(right))
}

function confirmDiscard(hasChanges: boolean): boolean {
  return !hasChanges || window.confirm('Discard your unsaved recipe changes?')
}

function collectErrors(input: RecipeInput) {
  const result = recipeInputSchema.safeParse(prepareInput(input))
  const errors: RecipeFieldErrors = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !(key in errors))
        errors[key as keyof RecipeInput] = issue.message
    }
    errors.form = 'Check the highlighted field and try saving again.'
  }
  return { parsed: result.success ? result.data : null, errors }
}

function RecipeMultilineEditor({
  draft,
  errors,
  setDraft,
}: {
  draft: RecipeInput
  errors: RecipeFieldErrors
  setDraft: (next: RecipeInput) => void
}) {
  return (
    <>
      <TextArea
        label="Ingredients"
        hint="Paste or type one ingredient per line, for example: 1 cup lentils."
        value={draft.ingredients ?? ''}
        error={errors.ingredients}
        rows={8}
        onChange={(event) =>
          setDraft({
            ...draft,
            ingredients: event.target.value.trim() === '' ? null : event.target.value,
          })
        }
      />
      <TextArea
        label="Instructions"
        hint="Paste or type the method as natural steps. Blank lines are fine while drafting."
        value={draft.description ?? ''}
        error={errors.description}
        rows={10}
        onChange={(event) =>
          setDraft({
            ...draft,
            description: event.target.value.trim() === '' ? null : event.target.value,
          })
        }
      />
    </>
  )
}

export function RecipesPage() {
  const { state } = useOnboarding()
  const repository = useRecipeRepository()
  const plannedMeals = usePlannedMealRepository()
  const shopping = useShoppingRepository()
  const householdId = state.householdId
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<RecipeInput>(emptyInput)
  const [fieldErrors, setFieldErrors] = useState<RecipeFieldErrors>({})
  const [editDraft, setEditDraft] = useState<RecipeInput>(emptyInput)
  const [editErrors, setEditErrors] = useState<RecipeFieldErrors>({})
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importDraft, setImportDraft] = useState<RecipeImportDraft | null>(null)
  const [importVisibility, setImportVisibility] = useState<ImportedRecipeVisibility>('public')
  const [importError, setImportError] = useState<string | null>(null)
  const [loadingImport, setLoadingImport] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickAddRecipeId, setQuickAddRecipeId] = useState<string | null>(null)
  const [quickAddStatus, setQuickAddStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!householdId) return
    repository
      .list(householdId)
      .then((next) => {
        if (!active) return
        setRecipes(next)
      })
      .catch(() => {
        if (active) setError('We could not load your recipe library. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, repository])

  const filteredRecipes = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase()
    return recipes.filter((recipe) => recipe.name.toLocaleLowerCase().includes(normalisedQuery))
  }, [query, recipes])
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId || saving) return
    const { parsed, errors } = collectErrors(draft)
    setFieldErrors(errors)
    if (!parsed) return
    setSaving(true)
    setError(null)
    try {
      const saved = await repository.create(householdId, parsed)
      setRecipes((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedId(saved.id)
      setDraft(emptyInput)
      setFieldErrors({})
      setCreating(false)
    } catch (saveError) {
      setFieldErrors({
        form:
          saveError instanceof Error ? saveError.message : 'Cooksmith could not save the recipe.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function requestImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loadingImport) return
    setLoadingImport(true)
    setImportError(null)
    try {
      if (!repository.importFromUrl) throw new Error('Recipe importing is not configured yet.')
      setImportDraft(await repository.importFromUrl(importUrl))
    } catch (requestError) {
      setImportError(
        requestError instanceof Error
          ? requestError.message
          : 'Cooksmith could not import that page. Try another URL.',
      )
    } finally {
      setLoadingImport(false)
    }
  }

  function updateImportedDraft(changes: Partial<RecipeImportDraft>) {
    setImportDraft((current) => (current ? { ...current, ...changes } : current))
  }

  async function saveImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!importDraft || saving) return
    const input: RecipeInput = {
      ...emptyInput,
      name: importDraft.name,
      ingredients: importDraft.ingredients,
      description: importDraft.description,
      sourceUrl: importDraft.sourceUrl,
      authorName: importDraft.authorName,
      publisherName: importDraft.publisherName,
      servings: importDraft.servings,
      prepTimeMinutes: importDraft.prepTimeMinutes,
      cookTimeMinutes: importDraft.cookTimeMinutes,
      imageUrl: importDraft.imageUrl,
    }
    const { parsed, errors } = collectErrors(input)
    if (!parsed) {
      setImportError(errors.form ?? 'Check the imported recipe and try again.')
      return
    }
    setSaving(true)
    setImportError(null)
    try {
      if (!repository.createImported) throw new Error('Recipe importing is not configured yet.')
      const saved = await repository.createImported(parsed, importVisibility)
      setRecipes((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedId(saved.id)
      setImporting(false)
      setImportDraft(null)
      setImportUrl('')
      setImportVisibility('public')
    } catch (saveError) {
      setImportError(
        saveError instanceof Error ? saveError.message : 'Cooksmith could not save the import.',
      )
    } finally {
      setSaving(false)
    }
  }

  function openEdit(recipe: Recipe) {
    setEditDraft(recipeToMultilineInput(recipe))
    setEditErrors({})
    setEditing(true)
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId || !selectedRecipe || saving) return
    const { parsed, errors } = collectErrors(editDraft)
    setEditErrors(errors)
    if (!parsed) return
    setSaving(true)
    try {
      const saved = await repository.update(householdId, selectedRecipe.id, parsed)
      setRecipes((current) => current.map((recipe) => (recipe.id === saved.id ? saved : recipe)))
      setEditing(false)
    } catch (saveError) {
      setEditErrors({
        form:
          saveError instanceof Error ? saveError.message : 'Cooksmith could not save the recipe.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function archive(recipe: Recipe) {
    if (!window.confirm(`Archive ${recipe.name}?`)) return
    try {
      if (!householdId) return
      await repository.archive(householdId, recipe.id)
      setRecipes((current) => current.filter((candidate) => candidate.id !== recipe.id))
      setSelectedId(null)
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'Cooksmith could not archive that recipe.',
      )
    }
  }

  async function quickAddRecipe(recipe: Recipe) {
    if (!householdId || quickAddRecipeId) return
    setQuickAddRecipeId(recipe.id)
    setQuickAddStatus(null)
    setError(null)
    try {
      const today = new Date()
      const searchStart = currentWeek(today)
      const searchEnd = addDays(searchStart, quickAddSearchWindowDays - 1)
      const existingMeals = await plannedMeals.listWeek(householdId, searchStart, searchEnd)
      const result = nextEmptyPlanDate(searchStart, existingMeals)
      if (result.kind === 'exhausted') {
        setError(
          `We could not find an empty date before ${formatDisplayDate(result.searchedUntil)}. Open the planner to choose a date.`,
        )
        return
      }
      const saved = await plannedMeals.create(householdId, {
        mealDate: result.mealDate,
        mealType: 'dinner',
        title: snapshotTitleForRecipe(recipe),
        notes: null,
        recipeId: recipe.id,
        recipeSource: recipeSourceForPlan(recipe),
      })
      const linkedMeal: PlannedMeal = {
        ...saved,
        recipeId: recipe.id,
        recipeSource: recipeSourceForPlan(recipe),
        linkedRecipe: { id: recipe.id, name: recipe.name, archivedAt: recipe.archivedAt },
        recipeState: {
          kind: 'active',
          recipe: { id: recipe.id, name: recipe.name, archivedAt: recipe.archivedAt },
        },
      }
      const additions = buildPlanAdditions([linkedMeal], [recipe], []).additions
      await shopping.createFromPlan?.(householdId, saved.id, additions)
      setQuickAddStatus(`${recipe.name} added to ${formatDisplayDate(result.mealDate)}.`)
    } catch (quickAddError) {
      setError(
        quickAddError instanceof Error
          ? quickAddError.message
          : 'Cooksmith could not add that recipe to the plan. Try again.',
      )
    } finally {
      setQuickAddRecipeId(null)
    }
  }

  if (loading) return <LoadingState label="Loading your recipe library" />

  return (
    <main className="page-stack">
      <DocumentTitle title="Recipe Library" />
      <header className="page-header recipe-library-header">
        <h1>Recipe Library</h1>
        <p>
          Save the recipes your household returns to, with ingredients and instructions together.
        </p>
      </header>
      {error ? <ErrorState title="Recipe library needs a quick check" message={error} /> : null}
      {quickAddStatus ? (
        <VisuallyHidden aria-live="polite" role="status">
          {quickAddStatus}
        </VisuallyHidden>
      ) : null}

      <Dialog
        open={creating}
        title="Add a recipe"
        description="Add the ingredients and instructions you need to cook it again."
        onOpenChange={(open) => {
          if (open || confirmDiscard(!recipesEqual(draft, emptyInput))) setCreating(open)
        }}
      >
        <form className="recipe-form" onSubmit={(event) => void submit(event)}>
          <TextField
            data-autofocus
            label="Recipe name"
            required
            value={draft.name}
            error={fieldErrors.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <RecipeMultilineEditor draft={draft} errors={fieldErrors} setDraft={setDraft} />
          <TextField
            label="Servings"
            inputMode="numeric"
            optional
            value={draft.servings ?? ''}
            error={fieldErrors.servings}
            onChange={(event) =>
              setDraft({
                ...draft,
                servings: event.target.value.trim() === '' ? null : Number(event.target.value),
              })
            }
          />
          <div className="recipe-form-compact">
            <TextField
              label="Preparation time in minutes"
              inputMode="numeric"
              optional
              value={draft.prepTimeMinutes ?? ''}
              error={fieldErrors.prepTimeMinutes}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  prepTimeMinutes:
                    event.target.value.trim() === '' ? null : Number(event.target.value),
                })
              }
            />
            <TextField
              label="Cooking time in minutes"
              inputMode="numeric"
              optional
              value={draft.cookTimeMinutes ?? ''}
              error={fieldErrors.cookTimeMinutes}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  cookTimeMinutes:
                    event.target.value.trim() === '' ? null : Number(event.target.value),
                })
              }
            />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.favourite}
              onChange={(event) => setDraft({ ...draft, favourite: event.target.checked })}
            />
            Favourite recipe
          </label>
          {fieldErrors.form ? <p className="form-error">{fieldErrors.form}</p> : null}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => {
                if (confirmDiscard(!recipesEqual(draft, emptyInput))) setCreating(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" busy={saving} disabled={draft.name.trim() === ''}>
              Save recipe
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={importing}
        title={importDraft ? 'Review imported recipe' : 'Import a recipe'}
        description={
          importDraft
            ? 'Check and correct the recipe before saving. Nothing has been saved yet.'
            : 'Paste a public recipe page URL. Some websites may not support importing.'
        }
        onOpenChange={(open) => {
          if (!open && importDraft && !window.confirm('Discard this imported recipe draft?')) return
          setImporting(open)
          if (!open) {
            setImportDraft(null)
            setImportError(null)
          }
        }}
      >
        {!importDraft ? (
          <form className="recipe-form" onSubmit={(event) => void requestImport(event)}>
            <TextField
              data-autofocus
              label="Recipe URL"
              type="url"
              required
              placeholder="https://example.com/recipe"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
            />
            {importError ? <p className="form-error">{importError}</p> : null}
            <div className="dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setImporting(false)}>
                Cancel
              </Button>
              <Button type="submit" busy={loadingImport} disabled={importUrl.trim() === ''}>
                Import recipe
              </Button>
            </div>
          </form>
        ) : (
          <form className="recipe-form" onSubmit={(event) => void saveImport(event)}>
            <TextField
              data-autofocus
              label="Recipe name"
              required
              value={importDraft.name}
              onChange={(event) => updateImportedDraft({ name: event.target.value })}
            />
            <TextField
              label="Author"
              optional
              value={importDraft.authorName ?? ''}
              onChange={(event) => updateImportedDraft({ authorName: event.target.value || null })}
            />
            <RecipeMultilineEditor
              draft={{
                ...emptyInput,
                name: importDraft.name,
                ingredients: importDraft.ingredients,
                description: importDraft.description,
              }}
              errors={{}}
              setDraft={(next) =>
                updateImportedDraft({
                  ingredients: next.ingredients,
                  description: next.description,
                })
              }
            />
            <fieldset className="visibility-choice">
              <legend>Who can see this recipe?</legend>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={importVisibility === 'public'}
                  onChange={() => setImportVisibility('public')}
                />
                <span>
                  <strong>Public</strong> — adds it to Cooksmith’s shared recipe bank.
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={importVisibility === 'private'}
                  onChange={() => setImportVisibility('private')}
                />
                <span>
                  <strong>Private</strong> — only you can see it.
                </span>
              </label>
            </fieldset>
            <p className="recipe-import-source">Source: {importDraft.sourceUrl}</p>
            {importDraft.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            {importError ? <p className="form-error">{importError}</p> : null}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setImportDraft(null)}
              >
                Back
              </Button>
              <Button type="submit" busy={saving} disabled={importDraft.name.trim() === ''}>
                Save imported recipe
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <div className="recipe-library-toolbar">
        <TextField
          label="Search recipes"
          placeholder="Search recipes"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="button" aria-label="Add recipe" onClick={() => setCreating(true)}>
          Add
        </Button>
        <Button type="button" variant="secondary" onClick={() => setImporting(true)}>
          Import
        </Button>
        <WeekPlanGenerator householdId={householdId} targetWeek={currentWeek(new Date())} />
      </div>
      {filteredRecipes.length === 0 ? (
        <Panel>
          <div className="empty-state">
            <h2>{recipes.length === 0 ? 'Start your recipe library' : 'No matching recipes'}</h2>
            <p>
              {recipes.length === 0
                ? 'Add a household favourite so it is easy to find again.'
                : 'Try a different recipe name or clear search.'}
            </p>
            {recipes.length > 0 && query.trim() !== '' ? (
              <Button type="button" variant="secondary" onClick={() => setQuery('')}>
                Clear search
              </Button>
            ) : null}
          </div>
        </Panel>
      ) : (
        <div className="pantry-grid recipe-library-grid">
          {filteredRecipes.map((recipe) => (
            <article className="pantry-card recipe-card" key={recipe.id}>
              <button
                aria-label={`Open ${recipe.name} recipe`}
                className="recipe-card-detail-action"
                type="button"
                onClick={() => setSelectedId(recipe.id)}
              >
                <span className="recipe-card-heading">{recipe.name}</span>
                <span className="recipe-card-summary">
                  {[minutesLabel(recipe), recipe.servings ? `${recipe.servings} servings` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Summary details not set'}
                </span>
              </button>
              <button
                aria-label={`Add ${recipe.name} to next available date`}
                className="recipe-card-quick-add"
                disabled={quickAddRecipeId !== null}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void quickAddRecipe(recipe)
                }}
              >
                {quickAddRecipeId === recipe.id ? 'Adding…' : '+'}
              </button>
            </article>
          ))}
        </div>
      )}
      {selectedRecipe && !editing ? (
        <Dialog
          open
          title={selectedRecipe.name}
          description={
            [
              minutesLabel(selectedRecipe),
              selectedRecipe.servings ? `${selectedRecipe.servings} servings` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Recipe details'
          }
          onOpenChange={(open) => {
            if (!open) setSelectedId(null)
          }}
        >
          <div className="recipe-detail-dialog">
            <h3>Ingredients</h3>
            {splitMeaningfulLines(recipeToMultilineInput(selectedRecipe).ingredients).length > 0 ? (
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
            <h3>Instructions</h3>
            {splitMeaningfulLines(recipeToMultilineInput(selectedRecipe).description).length > 0 ? (
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
            {selectedRecipe.favourite ? <p>Favourite recipe</p> : null}
            {selectedRecipe.authorName ? <p>By {selectedRecipe.authorName}</p> : null}
            {selectedRecipe.scope === 'public' ? <p>Shared Cooksmith recipe</p> : null}
            {selectedRecipe.scope === 'private' ? <p>Private recipe</p> : null}
            <div className="pantry-actions">
              {selectedRecipe.scope === 'household' || selectedRecipe.scope === undefined ? (
                <Button type="button" variant="secondary" onClick={() => openEdit(selectedRecipe)}>
                  Edit recipe
                </Button>
              ) : null}
              {selectedRecipe.scope === 'household' || selectedRecipe.scope === undefined ? (
                <Button type="button" variant="quiet" onClick={() => void archive(selectedRecipe)}>
                  Archive recipe
                </Button>
              ) : null}
            </div>
          </div>
        </Dialog>
      ) : null}
      {editing && selectedRecipe ? (
        <Dialog
          open={editing}
          title={`Edit ${selectedRecipe.name}`}
          description="Update this recipe summary."
          onOpenChange={(open) => {
            if (
              open ||
              confirmDiscard(!recipesEqual(editDraft, recipeToMultilineInput(selectedRecipe)))
            )
              setEditing(open)
          }}
        >
          <form className="recipe-form" onSubmit={(event) => void submitEdit(event)}>
            <TextField
              data-autofocus
              label="Recipe name"
              required
              value={editDraft.name}
              error={editErrors.name}
              onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
            />
            <RecipeMultilineEditor draft={editDraft} errors={editErrors} setDraft={setEditDraft} />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={editDraft.favourite}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    favourite: event.target.checked,
                  })
                }
              />
              Favourite recipe
            </label>
            <TextField
              label="Servings"
              inputMode="numeric"
              optional
              value={editDraft.servings ?? ''}
              error={editErrors.servings}
              onChange={(event) =>
                setEditDraft({
                  ...editDraft,
                  servings: event.target.value.trim() === '' ? null : Number(event.target.value),
                })
              }
            />
            <TextField
              label="Preparation time in minutes"
              inputMode="numeric"
              optional
              value={editDraft.prepTimeMinutes ?? ''}
              error={editErrors.prepTimeMinutes}
              onChange={(event) =>
                setEditDraft({
                  ...editDraft,
                  prepTimeMinutes:
                    event.target.value.trim() === '' ? null : Number(event.target.value),
                })
              }
            />
            <TextField
              label="Cooking time in minutes"
              inputMode="numeric"
              optional
              value={editDraft.cookTimeMinutes ?? ''}
              error={editErrors.cookTimeMinutes}
              onChange={(event) =>
                setEditDraft({
                  ...editDraft,
                  cookTimeMinutes:
                    event.target.value.trim() === '' ? null : Number(event.target.value),
                })
              }
            />
            {editErrors.form ? <p className="form-error">{editErrors.form}</p> : null}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  if (
                    confirmDiscard(!recipesEqual(editDraft, recipeToMultilineInput(selectedRecipe)))
                  )
                    setEditing(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" busy={saving} disabled={editDraft.name.trim() === ''}>
                Save changes
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </main>
  )
}
