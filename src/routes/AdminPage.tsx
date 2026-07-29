import { useCallback, useEffect, useState } from 'react'

import { useFeatureFlagRepository, useFeatureFlags } from '../app/admin/featureFlagContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { Stack } from '../components/layout/LayoutPrimitives'
import { ErrorState } from '../components/ui/ErrorState'
import { FeedbackState } from '../components/ui/FeedbackState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import type { FeatureFlag, FeatureFlagKey } from '../domain/admin/featureFlags'
import { useWeeklyPreparationAdminRepository } from '../app/admin/weeklyPreparationAdminContext'
import type {
  RecipeEnrichmentBackfillStatus,
  WeeklyPreparationEvaluation,
  WeeklyPreparationSettings,
} from '../application/admin/weeklyPreparationAdminRepository'
import { Button } from '../components/ui/Button'

export function AdminPage() {
  const repository = useFeatureFlagRepository()
  const featureFlags = useFeatureFlags()
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState<FeatureFlagKey | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      setFlags(await repository.list())
      setError(false)
    } catch {
      setError(true)
    }
  }, [repository])

  useEffect(() => {
    let active = true
    void repository
      .list()
      .then((next) => {
        if (active) setFlags(next)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [repository])

  async function update(flag: FeatureFlag, enabled: boolean) {
    setSaving(flag.key)
    setSaved(false)
    try {
      const next = await repository.update(flag.key, enabled)
      setFlags((current) => current?.map((item) => (item.key === next.key ? next : item)) ?? [next])
      await featureFlags.refresh()
      setSaved(true)
    } catch {
      setError(true)
    } finally {
      setSaving(null)
    }
  }

  if (error)
    return (
      <ErrorState
        title="We couldn’t load feature toggles"
        message="No settings were changed. Try again."
        actionLabel="Try again"
        onAction={() => void load()}
      />
    )
  if (!flags) return <LoadingState label="Loading feature toggles" />

  return (
    <Stack gap="large">
      <DocumentTitle title="Admin" />
      <PageHeader
        eyebrow="Admin"
        title="Feature toggles"
        description="Control optional Cooksmith experiences without a new application build."
      />
      {saved ? (
        <FeedbackState
          tone="success"
          title="Toggle updated"
          message="The new setting is now active."
        />
      ) : null}
      <Panel>
        <div className="feature-toggle-list">
          {flags.map((flag) => (
            <div className="feature-toggle-row" key={flag.key}>
              <div>
                <h2>{flag.name}</h2>
                <p>{flag.description}</p>
              </div>
              <label className="feature-toggle-control">
                <input
                  type="checkbox"
                  aria-label={flag.name}
                  checked={flag.enabled}
                  disabled={saving === flag.key}
                  onChange={(event) => void update(flag, event.target.checked)}
                />
                <span>{flag.enabled ? 'On' : 'Off'}</span>
              </label>
            </div>
          ))}
        </div>
      </Panel>
      <WeeklyPreparationOperations />
      <RecipeEnrichmentOperations />
    </Stack>
  )
}

function RecipeEnrichmentOperations() {
  const repository = useWeeklyPreparationAdminRepository()
  const [status, setStatus] = useState<RecipeEnrichmentBackfillStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!repository) return
    try {
      setStatus(await repository.getRecipeEnrichmentStatus())
      setMessage('')
    } catch {
      setMessage('Recipe enrichment progress could not be loaded. Try again.')
    }
  }, [repository])

  useEffect(() => {
    if (!repository) return
    let active = true
    void repository
      .getRecipeEnrichmentStatus()
      .then((next) => {
        if (active) setStatus(next)
      })
      .catch(() => {
        if (active) setMessage('Recipe enrichment progress could not be loaded. Try again.')
      })
    return () => {
      active = false
    }
  }, [repository])

  if (!repository) return null
  const adminRepository = repository

  async function command(action: 'start' | 'pause' | 'resume' | 'retry_failed' | 'reprocess_ai') {
    if (
      (action === 'start' || action === 'reprocess_ai') &&
      !window.confirm(
        action === 'reprocess_ai'
          ? `Re-enrich eligible recipes with Recipe Intelligence AI? Provider usage is capped at A$${status?.monthlyCostLimitAud.toFixed(2) ?? '0.00'} per month.`
          : 'Enrich eligible existing household and shared recipes?',
      )
    )
      return
    setBusy(true)
    try {
      setStatus(await adminRepository.commandRecipeEnrichment(action))
      setMessage(
        action === 'pause'
          ? 'New enrichment work is paused. Running work may finish safely.'
          : 'Recipe enrichment operation updated.',
      )
    } catch {
      setMessage(
        action === 'pause'
          ? 'Recipe enrichment could not be paused. Try again.'
          : 'Recipes may be queued, but processing could not start. Try resuming enrichment.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function setAi(enabled: boolean) {
    if (
      !window.confirm(
        enabled
          ? `Enable Recipe Intelligence AI? It sends only recipe ingredient and step excerpts to the configured provider and is capped at A$${status?.monthlyCostLimitAud.toFixed(2) ?? '0.00'} per month.`
          : 'Disable Recipe Intelligence AI? Deterministic enrichment will remain available.',
      )
    )
      return
    setBusy(true)
    try {
      setStatus(await adminRepository.setRecipeIntelligenceAi(enabled))
      setMessage(
        enabled
          ? 'Recipe Intelligence AI enabled. Existing recipes are unchanged until re-enriched.'
          : 'Recipe Intelligence AI disabled. Deterministic enrichment remains available.',
      )
    } catch {
      setMessage('Recipe Intelligence AI could not be updated. No setting was changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flow-stack" aria-labelledby="recipe-enrichment-title">
      <div>
        <h2 id="recipe-enrichment-title">Recipe enrichment</h2>
        <p>Prepare household and shared recipes for Get Ahead without changing recipe content.</p>
      </div>
      <p aria-live="polite">{message}</p>
      <Panel>
        {status ? (
          <>
            <dl className="admin-metrics-grid">
              <Metric
                label="Recipe Intelligence AI"
                value={status.aiEnabled ? 'Enabled' : 'Disabled'}
              />
              <Metric
                label="Monthly provider limit"
                value={`A$${status.monthlyCostLimitAud.toFixed(2)}`}
              />
              <Metric label="Household eligible" value={status.sources.household.eligible} />
              <Metric label="Household enriched" value={status.sources.household.current} />
              <Metric label="Shared eligible" value={status.sources.sharedPlatform.eligible} />
              <Metric label="Shared enriched" value={status.sources.sharedPlatform.current} />
              <Metric label="Queued" value={status.states.pending ?? 0} />
              <Metric label="Processing" value={status.states.processing ?? 0} />
              <Metric label="Completed" value={status.states.completed ?? 0} />
              <Metric label="Failed" value={status.states.failed ?? 0} />
              <Metric label="Rejected" value={status.states.cancelled ?? 0} />
              <Metric label="Skipped" value={0} />
            </dl>
            {status.latestProviderFailure ? (
              <div role="status" className="flow-stack">
                <h3>Latest AI provider error</h3>
                <p>
                  HTTP {status.latestProviderFailure.httpStatus}
                  {status.latestProviderFailure.errorCode
                    ? ` · ${status.latestProviderFailure.errorCode}`
                    : ''}
                  {status.latestProviderFailure.errorParam
                    ? ` · ${status.latestProviderFailure.errorParam}`
                    : ''}
                </p>
                {status.latestProviderFailure.requestId ? (
                  <p>Request ID: {status.latestProviderFailure.requestId}</p>
                ) : null}
              </div>
            ) : null}
            <div className="cluster">
              <Button disabled={busy} onClick={() => void setAi(!status.aiEnabled)}>
                {status.aiEnabled
                  ? 'Disable Recipe Intelligence AI'
                  : 'Enable Recipe Intelligence AI'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !status.aiEnabled || status.paused}
                onClick={() => void command('reprocess_ai')}
              >
                Re-enrich with AI
              </Button>
              <Button disabled={busy || status.paused} onClick={() => void command('start')}>
                Enrich existing recipes
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void command(status.paused ? 'resume' : 'pause')}
              >
                {status.paused ? 'Resume enrichment' : 'Pause enrichment'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !status.states.failed}
                onClick={() => void command('retry_failed')}
              >
                Retry failed
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void refresh()}>
                Refresh progress
              </Button>
            </div>
          </>
        ) : (
          <LoadingState label="Loading recipe enrichment progress" />
        )}
      </Panel>
    </section>
  )
}

function WeeklyPreparationOperations() {
  const repository = useWeeklyPreparationAdminRepository()
  const [settings, setSettings] = useState<WeeklyPreparationSettings | null>(null)
  const [evaluation, setEvaluation] = useState<WeeklyPreparationEvaluation | null>(null)
  const [loading, setLoading] = useState(Boolean(repository))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!repository) return
    let active = true
    void Promise.all([repository.getSettings(), repository.getLatestEvaluation()])
      .then(([nextSettings, nextEvaluation]) => {
        if (!active) return
        setSettings(nextSettings)
        setEvaluation(nextEvaluation)
      })
      .catch(() => {
        if (active) setMessage('Weekly preparation controls could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repository])

  if (!repository) return null
  if (loading) return <LoadingState label="Loading weekly preparation operations" />
  if (!settings)
    return (
      <FeedbackState
        tone="info"
        title="Weekly preparation controls unavailable"
        message={message || 'Try opening the admin portal again.'}
      />
    )

  const adminRepository = repository

  async function update(next: Pick<WeeklyPreparationSettings, 'aiEnabled' | 'emergencyStop'>) {
    const action = next.emergencyStop
      ? 'activate the emergency stop'
      : next.aiEnabled
        ? 'enable AI assistance'
        : 'apply these safer controls'
    if (!window.confirm(`Confirm you want to ${action}?`)) return
    setSaving(true)
    setMessage('')
    try {
      setSettings(await adminRepository.updateSettings(next))
      setMessage('Weekly preparation controls updated and recorded in the audit log.')
    } catch {
      setMessage('No weekly preparation controls were changed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flow-stack" aria-labelledby="weekly-preparation-operations-title">
      <div>
        <h2 id="weekly-preparation-operations-title">Weekly preparation operations</h2>
        <p>Control model assistance and review privacy-safe release evidence.</p>
      </div>
      <p aria-live="polite">{message}</p>
      <Panel>
        <dl className="admin-metrics-grid">
          <div>
            <dt>AI assistance</dt>
            <dd>{settings.aiEnabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div>
            <dt>Emergency stop</dt>
            <dd>{settings.emergencyStop ? 'Active' : 'Clear'}</dd>
          </div>
          <div>
            <dt>Configured model</dt>
            <dd>{settings.modelIdentifier}</dd>
          </div>
          <div>
            <dt>Last changed</dt>
            <dd>{new Date(settings.updatedAt).toLocaleString('en-AU')}</dd>
          </div>
        </dl>
        <div className="cluster">
          <Button
            disabled={saving || settings.emergencyStop}
            onClick={() =>
              void update({
                aiEnabled: !settings.aiEnabled,
                emergencyStop: settings.emergencyStop,
              })
            }
          >
            {settings.aiEnabled ? 'Disable AI assistance' : 'Enable AI assistance'}
          </Button>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void update({
                aiEnabled: settings.aiEnabled,
                emergencyStop: !settings.emergencyStop,
              })
            }
          >
            {settings.emergencyStop ? 'Clear emergency stop' : 'Activate emergency stop'}
          </Button>
        </div>
      </Panel>
      <Panel>
        <h3>30-plan evaluation</h3>
        {evaluation ? (
          <dl className="admin-metrics-grid">
            <Metric label="Plans" value={evaluation.planCount} />
            <Metric label="Deterministic" value={evaluation.deterministicCount} />
            <Metric label="Model calls" value={evaluation.modelCallCount} />
            <Metric label="Valid outputs" value={evaluation.validOutputCount} />
            <Metric label="Reviewed correct" value={evaluation.reviewedCorrectCount} />
            <Metric label="Unsupported data" value={evaluation.unsupportedCount} />
            <Metric label="Fallbacks" value={evaluation.fallbackCount} />
            <Metric label="Average latency" value={`${evaluation.averageLatencyMs} ms`} />
            <Metric
              label="Token usage"
              value={`${evaluation.inputTokens + evaluation.outputTokens}`}
            />
            <Metric
              label="Estimated cost"
              value={`A$${evaluation.estimatedCostAud.toFixed(4)} per 30 plans`}
            />
            <Metric label="Chop/dice decision" value={evaluation.ambiguousDecision} />
          </dl>
        ) : (
          <p>No hosted evaluation has been recorded. AI assistance must remain disabled.</p>
        )}
      </Panel>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
