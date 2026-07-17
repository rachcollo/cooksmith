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
  description: null,
  sourceNote: null,
  sourceUrl: null,
  servings: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  imageUrl: null,
}

type RecipeFieldErrors = Partial<Record<keyof RecipeInput | 'form', string>>

function minutesLabel(recipe: Recipe) {
  const total = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  return total > 0 ? `${total} min total` : null
}

function toInput(recipe: Recipe): RecipeInput {
  return {
    name: recipe.name,
    description: recipe.description,
    sourceNote: recipe.sourceNote,
    sourceUrl: recipe.sourceUrl,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    imageUrl: recipe.imageUrl,
  }
}

function collectErrors(input: RecipeInput) {
  const result = recipeInputSchema.safeParse(input)
  const errors: RecipeFieldErrors = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !(key in errors))
        errors[key as keyof RecipeInput] = issue.message
    }
  }
  return { parsed: result.success ? result.data : null, errors }
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
    if (!selectedRecipe) return
    const { parsed, errors } = collectErrors(editDraft)
    setEditErrors(errors)
    if (!parsed) return
    setSaving(true)
    try {
      const saved = await repository.update(selectedRecipe.id, parsed)
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
      await repository.archive(recipe.id)
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
          Save the meals your household returns to, with ingredients and method steps coming later.
        </p>
      </header>
      {error ? <ErrorState title="Recipe library needs a quick check" message={error} /> : null}
      <Panel>
        <h2>Add a recipe</h2>
        <form className="pantry-form" onSubmit={(event) => void submit(event)}>
          <TextField
            label="Recipe name"
            required
            value={draft.name}
            error={fieldErrors.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <TextArea
            label="Description"
            optional
            value={draft.description ?? ''}
            error={fieldErrors.description}
            onChange={(event) => updateDraft('description', event.target.value)}
          />
          <TextField
            label="Source note"
            optional
            value={draft.sourceNote ?? ''}
            error={fieldErrors.sourceNote}
            onChange={(event) => updateDraft('sourceNote', event.target.value)}
          />
          <TextField
            label="Source URL"
            optional
            value={draft.sourceUrl ?? ''}
            error={fieldErrors.sourceUrl}
            onChange={(event) => updateDraft('sourceUrl', event.target.value)}
          />
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
          <TextField
            label="Image URL"
            optional
            value={draft.imageUrl ?? ''}
            error={fieldErrors.imageUrl}
            onChange={(event) => updateDraft('imageUrl', event.target.value)}
          />
          {fieldErrors.form ? <p className="form-error">{fieldErrors.form}</p> : null}
          <Button type="submit" busy={saving} disabled={draft.name.trim() === ''}>
            Save recipe
          </Button>
        </form>
      </Panel>
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
            <article className="pantry-card" key={recipe.id}>
              <h2>{recipe.name}</h2>
              <p>
                {[minutesLabel(recipe), recipe.servings ? `${recipe.servings} servings` : null]
                  .filter(Boolean)
                  .join(' · ') || 'Summary details not set'}
              </p>
              <Button type="button" variant="secondary" onClick={() => setSelectedId(recipe.id)}>
                Open details
              </Button>
            </article>
          ))}
        </div>
      )}
      {selectedRecipe ? (
        <Panel>
          <h2>{selectedRecipe.name}</h2>
          {selectedRecipe.description ? (
            <p>{selectedRecipe.description}</p>
          ) : (
            <p>Ingredients and method steps will be added in a later milestone.</p>
          )}
          <dl>
            <dt>Servings</dt>
            <dd>{selectedRecipe.servings ?? 'Not set'}</dd>
            <dt>Preparation time</dt>
            <dd>
              {selectedRecipe.prepTimeMinutes
                ? `${selectedRecipe.prepTimeMinutes} minutes`
                : 'Not set'}
            </dd>
            <dt>Cooking time</dt>
            <dd>
              {selectedRecipe.cookTimeMinutes
                ? `${selectedRecipe.cookTimeMinutes} minutes`
                : 'Not set'}
            </dd>
          </dl>
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
          <form className="pantry-form" onSubmit={(event) => void submitEdit(event)}>
            <TextField
              data-autofocus
              label="Recipe name"
              required
              value={editDraft.name}
              error={editErrors.name}
              onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
            />
            <TextArea
              label="Description"
              optional
              value={editDraft.description ?? ''}
              error={editErrors.description}
              onChange={(event) => updateEditDraft('description', event.target.value)}
            />
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
