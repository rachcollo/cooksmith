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
  ingredientRows: [{ name: '', quantity: null, unit: null, preparation: null }],
  steps: [{ instruction: '' }],
}

type RecipeFieldErrors = Partial<Record<keyof RecipeInput | 'form', string>>

function minutesLabel(recipe: Recipe) {
  const total = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  return total > 0 ? `${total} min total` : null
}

function toInput(recipe: Recipe): RecipeInput {
  return {
    name: recipe.name,
    ingredients: recipe.ingredients,
    description: recipe.description,
    sourceNote: recipe.sourceNote,
    sourceUrl: recipe.sourceUrl,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    imageUrl: recipe.imageUrl,
    notes: recipe.notes,
    category: recipe.category,
    tags: recipe.tags,
    favourite: recipe.favourite,
    ingredientRows:
      recipe.ingredientRows.length > 0
        ? recipe.ingredientRows.map(({ name, quantity, unit, preparation }) => ({
            name,
            quantity,
            unit,
            preparation,
          }))
        : [{ name: recipe.ingredients ?? '', quantity: null, unit: null, preparation: null }],
    steps:
      recipe.steps.length > 0
        ? recipe.steps.map(({ instruction }) => ({ instruction }))
        : [{ instruction: recipe.description ?? '' }],
  }
}

function prepareInput(input: RecipeInput): RecipeInput {
  const ingredientRows = input.ingredientRows.filter((row) => row.name.trim() !== '')
  const steps = input.steps.filter((step) => step.instruction.trim() !== '')
  return {
    ...input,
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    ingredientRows,
    steps,
    ingredients:
      ingredientRows.length > 0
        ? ingredientRows
            .map((row) =>
              [row.quantity, row.unit, row.name, row.preparation].filter(Boolean).join(' '),
            )
            .join('\n')
        : input.ingredients,
    description:
      steps.length > 0 ? steps.map((step) => step.instruction).join('\n') : input.description,
  }
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

function RecipeRowsEditor({
  draft,
  setDraft,
}: {
  draft: RecipeInput
  setDraft: (next: RecipeInput) => void
}) {
  function update(index: number, key: keyof RecipeInput['ingredientRows'][number], value: string) {
    const ingredientRows = draft.ingredientRows.map((row, candidate) =>
      candidate === index ? { ...row, [key]: value.trim() === '' ? null : value } : row,
    )
    setDraft({ ...draft, ingredientRows })
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...draft.ingredientRows]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const current = next[index]
    const targetRow = next[target]
    if (!current || !targetRow) return
    next[index] = targetRow
    next[target] = current
    setDraft({ ...draft, ingredientRows: next })
  }
  return (
    <fieldset className="recipe-rows">
      <legend>Ingredients</legend>
      {draft.ingredientRows.map((row, index) => (
        <div className="recipe-row" key={index}>
          <TextField
            label={index === 0 ? 'Ingredients' : `Ingredient ${index + 1} name`}
            value={row.name}
            onChange={(event) => update(index, 'name', event.target.value)}
          />
          <TextField
            label={`Ingredient ${index + 1} quantity`}
            optional
            value={row.quantity ?? ''}
            onChange={(event) => update(index, 'quantity', event.target.value)}
          />
          <TextField
            label={`Ingredient ${index + 1} unit`}
            optional
            value={row.unit ?? ''}
            onChange={(event) => update(index, 'unit', event.target.value)}
          />
          <TextField
            label={`Ingredient ${index + 1} preparation`}
            optional
            value={row.preparation ?? ''}
            onChange={(event) => update(index, 'preparation', event.target.value)}
          />
          <div className="recipe-row-actions">
            <Button
              type="button"
              variant="quiet"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move ingredient up
            </Button>
            <Button
              type="button"
              variant="quiet"
              disabled={index === draft.ingredientRows.length - 1}
              onClick={() => move(index, 1)}
            >
              Move ingredient down
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() =>
                setDraft({
                  ...draft,
                  ingredientRows: draft.ingredientRows.filter(
                    (_, candidate) => candidate !== index,
                  ),
                })
              }
            >
              Remove ingredient
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          setDraft({
            ...draft,
            ingredientRows: [
              ...draft.ingredientRows,
              { name: '', quantity: null, unit: null, preparation: null },
            ],
          })
        }
      >
        Add ingredient
      </Button>
    </fieldset>
  )
}

function RecipeStepsEditor({
  draft,
  setDraft,
}: {
  draft: RecipeInput
  setDraft: (next: RecipeInput) => void
}) {
  function move(index: number, direction: -1 | 1) {
    const next = [...draft.steps]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const current = next[index]
    const targetRow = next[target]
    if (!current || !targetRow) return
    next[index] = targetRow
    next[target] = current
    setDraft({ ...draft, steps: next })
  }
  return (
    <fieldset className="recipe-rows">
      <legend>Instructions</legend>
      {draft.steps.map((step, index) => (
        <div className="recipe-row" key={index}>
          <TextArea
            label={index === 0 ? 'Instructions' : `Step ${index + 1}`}
            value={step.instruction}
            onChange={(event) =>
              setDraft({
                ...draft,
                steps: draft.steps.map((row, candidate) =>
                  candidate === index ? { instruction: event.target.value } : row,
                ),
              })
            }
          />
          <div className="recipe-row-actions">
            <Button
              type="button"
              variant="quiet"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move step up
            </Button>
            <Button
              type="button"
              variant="quiet"
              disabled={index === draft.steps.length - 1}
              onClick={() => move(index, 1)}
            >
              Move step down
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() =>
                setDraft({
                  ...draft,
                  steps: draft.steps.filter((_, candidate) => candidate !== index),
                })
              }
            >
              Remove step
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setDraft({ ...draft, steps: [...draft.steps, { instruction: '' }] })}
      >
        Add step
      </Button>
    </fieldset>
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
        setSelectedId((current) => current ?? next[0]?.id ?? null)
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
    if (!householdId) return
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
    setEditDraft(toInput(recipe))
    setEditErrors({})
    setEditing(true)
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId || !selectedRecipe) return
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
      <header className="page-header">
        <p className="eyebrow">Things worth cooking</p>
        <h1>Recipe Library</h1>
        <p>
          Save the recipes your household returns to, with ingredients and instructions together.
        </p>
      </header>
      {error ? <ErrorState title="Recipe library needs a quick check" message={error} /> : null}
      <div className="pantry-actions">
        <Button type="button" onClick={() => setCreating(true)}>
          Add recipe
        </Button>
      </div>
      <Dialog
        open={creating}
        title="Add a recipe"
        description="Add the ingredients and instructions you need to cook it again."
        onOpenChange={setCreating}
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
          <RecipeRowsEditor draft={draft} setDraft={setDraft} />
          <RecipeStepsEditor draft={draft} setDraft={setDraft} />
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
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button type="submit" busy={saving} disabled={draft.name.trim() === ''}>
              Save recipe
            </Button>
          </div>
        </form>
      </Dialog>
      <Panel>
        <TextField
          label="Search recipes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Panel>
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
      {selectedRecipe ? (
        <Panel>
          <h2>{selectedRecipe.name}</h2>
          <h3>Ingredients</h3>
          {selectedRecipe.ingredientRows.length > 0 ? (
            <ul>
              {selectedRecipe.ingredientRows.map((row) => (
                <li key={row.id}>
                  {[row.quantity, row.unit, row.name, row.preparation].filter(Boolean).join(' ')}
                </li>
              ))}
            </ul>
          ) : (
            <p>{selectedRecipe.ingredients ?? 'No ingredients added yet.'}</p>
          )}
          <h3>Instructions</h3>
          {selectedRecipe.steps.length > 0 ? (
            <ol>
              {selectedRecipe.steps.map((step) => (
                <li key={step.id}>{step.instruction}</li>
              ))}
            </ol>
          ) : (
            <p>{selectedRecipe.description ?? 'No instructions added yet.'}</p>
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
        </Panel>
      ) : null}
      {editing && selectedRecipe ? (
        <Dialog
          open={editing}
          title={`Edit ${selectedRecipe.name}`}
          description="Update this recipe summary."
          onOpenChange={(open) => {
            if (!open) setEditing(false)
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
            <RecipeRowsEditor draft={editDraft} setDraft={setEditDraft} />
            <RecipeStepsEditor draft={editDraft} setDraft={setEditDraft} />
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
                onClick={() => setEditing(false)}
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
