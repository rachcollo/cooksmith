import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useWeeklyPreparationAdminRepository } from '../app/admin/weeklyPreparationAdminContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import type { AdminRecipeEnrichment } from '../application/admin/weeklyPreparationAdminRepository'
import { PageHeader } from '../components/layout/PageHeader'
import { Stack } from '../components/layout/LayoutPrimitives'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { TextField } from '../components/ui/TextField'

const statusLabels: Record<AdminRecipeEnrichment['status'], string> = {
  preparing: 'Preparing recipe insights',
  ready: 'Ready',
  failed: 'Couldn’t enrich',
  not_scheduled: 'Not scheduled',
}

export function AdminRecipesPage() {
  const repository = useWeeklyPreparationAdminRepository()
  const [recipes, setRecipes] = useState<AdminRecipeEnrichment[] | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AdminRecipeEnrichment['status'] | 'all'>('all')
  const [message, setMessage] = useState('')
  const [retrying, setRetrying] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!repository) return
    try {
      setRecipes(await repository.listRecipeEnrichments({ query, status }))
      setMessage('')
    } catch {
      setMessage('Recipe insight statuses could not be loaded. Try again.')
    }
  }, [query, repository, status])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  if (!repository)
    return <ErrorState title="Recipe management unavailable" message="Try opening Admin again." />
  if (!recipes && !message) return <LoadingState label="Loading recipe insight statuses" />

  async function retry(recipe: AdminRecipeEnrichment) {
    if (!window.confirm(`Retry insights for ${recipe.name}?`)) return
    setRetrying(recipe.recipeId)
    try {
      await repository!.retryRecipeEnrichment(recipe.recipeId, recipe.sourceKind)
      setMessage('Recipe insights queued for retry.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recipe insights could not be retried.')
    } finally {
      setRetrying(null)
    }
  }

  return (
    <Stack gap="large">
      <DocumentTitle title="Admin recipes" />
      <PageHeader
        eyebrow="Admin"
        title="Recipes"
        description="Review and manage current recipe insight outcomes."
      />
      <Link to="/admin">Back to Admin</Link>
      <Panel>
        <div className="admin-recipe-filters">
          <TextField
            label="Search recipes"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="field">
            <span className="form-label">Insight status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>
      <p aria-live="polite">{message}</p>
      <Panel>
        <div className="admin-recipe-table-wrap">
          <table aria-label="Recipe insight management">
            <thead>
              <tr>
                <th scope="col">Recipe</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(recipes ?? []).map((recipe) => (
                <tr key={`${recipe.sourceKind}:${recipe.recipeId}`}>
                  <th scope="row">{recipe.name}</th>
                  <td>{recipe.ownerLabel}</td>
                  <td>
                    {statusLabels[recipe.status]}
                    {recipe.aiActive ? ' · AI active' : ''}
                  </td>
                  <td>
                    <time dateTime={recipe.updatedAt}>
                      {new Date(recipe.updatedAt).toLocaleDateString('en-AU')}
                    </time>
                  </td>
                  <td>
                    <div className="admin-recipe-actions">
                      {recipe.retryable ? (
                        <Button
                          variant="secondary"
                          busy={retrying === recipe.recipeId}
                          onClick={() => void retry(recipe)}
                        >
                          Retry insights
                        </Button>
                      ) : null}
                      {recipe.canEdit ? (
                        <Link
                          className="button button-quiet button-default"
                          to={`/recipes?recipe=${recipe.recipeId}&edit=1`}
                        >
                          Edit recipe
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {recipes?.length === 0 ? (
                <tr>
                  <td colSpan={5}>No recipes match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </Stack>
  )
}
