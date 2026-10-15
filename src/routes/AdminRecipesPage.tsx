import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useWeeklyPreparationAdminRepository } from '../app/admin/weeklyPreparationAdminContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import type {
  AdminRecipeEnrichment,
  RecipeRepairInspection,
} from '../application/admin/weeklyPreparationAdminRepository'
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
  limited: 'No prep opportunities found',
  failed: 'Couldn’t enrich',
  not_scheduled: 'Not scheduled',
}

export function AdminRecipesPage() {
  const repository = useWeeklyPreparationAdminRepository()
  const [recipes, setRecipes] = useState<AdminRecipeEnrichment[] | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AdminRecipeEnrichment['status'] | 'all'>('all')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<AdminRecipeEnrichment | null>(null)
  const [inspection, setInspection] = useState<RecipeRepairInspection | null>(null)
  const [busy, setBusy] = useState(false)
  const [repairMessage, setRepairMessage] = useState('')
  const sequence = useRef(0)
  const requestId = useRef<string | null>(null)
  const inspectionHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    inspectionHeading.current?.focus()
  }, [selected])

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

  async function inspect(recipe: AdminRecipeEnrichment) {
    const current = ++sequence.current
    setSelected(recipe)
    setInspection(null)
    setRepairMessage('')
    requestId.current = null
    try {
      const result = await repository!.inspectRecipeRepair(recipe.recipeId, recipe.sourceKind)
      if (current === sequence.current) setInspection(result)
    } catch {
      if (current === sequence.current)
        setRepairMessage('Recipe details could not be loaded. Select Inspect again.')
    }
  }

  async function refreshRepair() {
    if (!selected) return
    const current = sequence.current
    try {
      const result = await repository!.inspectRecipeRepair(selected.recipeId, selected.sourceKind)
      if (current !== sequence.current) return
      setInspection(result)
      if (
        result.repair &&
        !['pending', 'processing'].includes(result.repair.state) &&
        (!result.repair.providerStarted || result.repair.estimatedCostAud !== null)
      )
        requestId.current = null
    } catch {
      if (current !== sequence.current) return
      setInspection(null)
      setRepairMessage('The latest result could not be loaded. Refresh before another attempt.')
    }
  }

  async function repair() {
    if (!selected || !inspection || busy) return
    if (
      !window.confirm(
        `Repair insights for ${selected.name} only? This makes at most one paid AI attempt. Original recipe content stays unchanged.`,
      )
    )
      return
    setBusy(true)
    setRepairMessage('Repairing this recipe. You can return here to review the result.')
    try {
      // Retain this key when reservation acknowledgement is lost.
      requestId.current ??= crypto.randomUUID()
      const jobId =
        inspection.repair?.state === 'pending'
          ? inspection.repair.jobId
          : await repository!.prepareRecipeRepair(
              selected.recipeId,
              selected.sourceKind,
              requestId.current,
            )
      await repository!.runRecipeRepair(jobId)
      setRepairMessage('Review the recorded outcome and cost below before another attempt.')
    } catch (error) {
      setRepairMessage(
        error instanceof Error ? error.message : 'Repair response unavailable. Refresh the result.',
      )
    } finally {
      await refreshRepair()
      await load()
      setBusy(false)
    }
  }

  const lastRepair = inspection?.repair
  const needsReview =
    lastRepair?.state === 'processing' ||
    (lastRepair?.providerStarted && lastRepair.estimatedCostAud === null)

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
      {selected ? (
        <Panel>
          <Stack>
            <h2 ref={inspectionHeading} tabIndex={-1}>
              {selected.name}
            </h2>
            <p>{selected.ownerLabel}</p>
            {inspection ? (
              <>
                <p>
                  Current rules ({inspection.rulesVersion}):{' '}
                  {inspection.currentRules ? 'Ready' : 'Missing or outdated AI insights'}
                </p>
                <p>Latest failure: {failureLabel(inspection.failureCategory)}</p>
                {!inspection.enabled ? (
                  <p>
                    Repair is paused. Recipe Intelligence must be enabled and unpaused in Admin
                    before a repair can run.
                  </p>
                ) : null}
                {lastRepair ? (
                  <>
                    <p>
                      Last repair: {lastRepair.state}
                      {lastRepair.leaseExpired ? ' — response overdue; review required' : ''} ·{' '}
                      {failureLabel(lastRepair.failureCategory)}
                    </p>
                    <p>
                      Estimated cost:{' '}
                      {lastRepair.estimatedCostAud === null
                        ? lastRepair.providerStarted
                          ? 'Unavailable — review required'
                          : 'Not incurred yet'
                        : `A$${lastRepair.estimatedCostAud.toFixed(6)}`}
                    </p>
                  </>
                ) : (
                  <p>No targeted repair recorded.</p>
                )}
                {needsReview ? (
                  <p>
                    Refresh the result. Another attempt is blocked while processing or while its
                    cost is unknown.
                  </p>
                ) : null}
                <div className="admin-recipe-actions">
                  <Button
                    disabled={!inspection.enabled || Boolean(needsReview)}
                    busy={busy}
                    onClick={() => void repair()}
                  >
                    {lastRepair?.state === 'pending' ? 'Run reserved repair' : 'Repair this recipe'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => void refreshRepair()}>
                    Refresh result
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>
                  {repairMessage ? 'Recipe details are unavailable.' : 'Loading recipe details…'}
                </p>
                <Button variant="secondary" disabled={busy} onClick={() => void refreshRepair()}>
                  Refresh result
                </Button>
              </>
            )}
            <p aria-live="polite">{repairMessage}</p>
          </Stack>
        </Panel>
      ) : null}
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
                      <Button
                        variant="secondary"
                        aria-label={`Inspect ${recipe.name}`}
                        disabled={busy}
                        onClick={() => void inspect(recipe)}
                      >
                        Inspect
                      </Button>
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

function failureLabel(category: string | null) {
  const labels: Record<string, string> = {
    schema_invalid: 'AI output did not pass validation',
    unsupported_data: 'Recipe data is not supported',
    unsupported_reference: 'AI output referenced missing recipe details',
    source_mismatch: 'AI output did not match the source recipe',
    stale_version: 'Recipe changed during processing',
    timeout: 'Provider timed out',
    transient_provider: 'Temporary provider failure',
    permanent_provider: 'Provider rejected the request',
    internal_validation: 'Processing failed validation',
    disabled: 'Recipe Intelligence was paused',
    usage_limit: 'Processing budget reached',
  }
  return category ? (labels[category] ?? 'Processing could not complete') : 'None recorded'
}
