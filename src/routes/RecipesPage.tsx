import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { TextArea } from '../components/ui/TextArea'
import { TextField } from '../components/ui/TextField'
import {
  prepareMultilineRecipeInput,
  recipeToMultilineInput,
  splitMeaningfulLines,
} from '../domain/recipes/multilineContent'
import type { Recipe, RecipeInput } from '../domain/recipes/types'
import { recipeInputSchema } from '../domain/recipes/validationSchemas'

const emptyInput: RecipeInput = {
  name: '',
  ingredients: null,
  description: null,
  sourceNote: null,
  sourceUrl: null,
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

function tagsText(tags: string[]) {
  return tags.join(', ')
}

function tagsFromText(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
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
  const householdId = state.householdId
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<RecipeInput>(emptyInput)
  const [fieldErrors, setFieldErrors] = useState<RecipeFieldErrors>({})
  const [editDraft, setEditDraft] = useState<RecipeInput>(emptyInput)
  const [editErrors, setEditErrors] = useState<RecipeFieldErrors>({})
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedId) ?? filteredRecipes[0] ?? null

  function updateDraft(key: keyof RecipeInput, value: string) {
    setDraft({ ...draft, [key]: value.trim() === '' ? null : value })
  }

  function updateEditDraft(key: keyof RecipeInput, value: string) {
    setEditDraft({ ...editDraft, [key]: value.trim() === '' ? null : value })
  }

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
          <TextArea
            label="Recipe notes"
            optional
            value={draft.notes ?? ''}
            error={fieldErrors.notes}
            onChange={(event) => updateDraft('notes', event.target.value)}
          />
          <TextField
            label="Category"
            optional
            value={draft.category ?? ''}
            error={fieldErrors.category}
            onChange={(event) => updateDraft('category', event.target.value)}
          />
          <TextField
            label="Tags, separated by commas"
            optional
            value={tagsText(draft.tags)}
            onChange={(event) => setDraft({ ...draft, tags: tagsFromText(event.target.value) })}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.favourite}
              onChange={(event) => setDraft({ ...draft, favourite: event.target.checked })}
            />
            Favourite recipe
          </label>
          <TextField
            label="Source or website"
            optional
            hint="You can enter a website with or without https://."
            value={draft.sourceUrl ?? ''}
            error={fieldErrors.sourceUrl}
            onChange={(event) => updateDraft('sourceUrl', event.target.value)}
          />
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
      <div className="recipe-library-toolbar">
        <TextField
          label="Search recipes"
          placeholder="Search recipes"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="button" onClick={() => setCreating(true)}>
          Add recipe
        </Button>
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
        <div className="pantry-grid">
          {filteredRecipes.map((recipe) => (
            <button
              aria-label={`Open ${recipe.name} recipe`}
              className="pantry-card recipe-card"
              key={recipe.id}
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
            {selectedRecipe.notes ? <p>Notes: {selectedRecipe.notes}</p> : null}
            {selectedRecipe.category ? <p>Category: {selectedRecipe.category}</p> : null}
            {selectedRecipe.tags.length > 0 ? <p>Tags: {selectedRecipe.tags.join(', ')}</p> : null}
            {selectedRecipe.favourite ? <p>Favourite recipe</p> : null}
            {selectedRecipe.sourceNote ? <p>Source: {selectedRecipe.sourceNote}</p> : null}
            {selectedRecipe.sourceUrl ? (
              <p>
                <a href={selectedRecipe.sourceUrl} target="_blank" rel="noreferrer">
                  Open source link
                </a>
              </p>
            ) : null}
            <div className="pantry-actions">
              <Button type="button" variant="secondary" onClick={() => openEdit(selectedRecipe)}>
                Edit recipe
              </Button>
              <Button type="button" variant="quiet" onClick={() => void archive(selectedRecipe)}>
                Archive recipe
              </Button>
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
            <TextArea
              label="Recipe notes"
              optional
              value={editDraft.notes ?? ''}
              error={editErrors.notes}
              onChange={(event) => updateEditDraft('notes', event.target.value)}
            />
            <TextField
              label="Category"
              optional
              value={editDraft.category ?? ''}
              error={editErrors.category}
              onChange={(event) => updateEditDraft('category', event.target.value)}
            />
            <TextField
              label="Tags, separated by commas"
              optional
              value={tagsText(editDraft.tags)}
              onChange={(event) =>
                setEditDraft({
                  ...editDraft,
                  tags: tagsFromText(event.target.value),
                })
              }
            />
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
              label="Source note"
              optional
              value={editDraft.sourceNote ?? ''}
              error={editErrors.sourceNote}
              onChange={(event) => updateEditDraft('sourceNote', event.target.value)}
            />
            <TextField
              label="Source URL"
              optional
              value={editDraft.sourceUrl ?? ''}
              error={editErrors.sourceUrl}
              onChange={(event) => updateEditDraft('sourceUrl', event.target.value)}
            />
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
            <TextField
              label="Image URL"
              optional
              value={editDraft.imageUrl ?? ''}
              error={editErrors.imageUrl}
              onChange={(event) => updateEditDraft('imageUrl', event.target.value)}
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
