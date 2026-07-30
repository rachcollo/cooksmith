import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

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
      <Panel>
        <h2>Recipe management</h2>
        <p>
          Review current recipe insight status, retry genuine failures and edit household recipes.
        </p>
        <Link className="button button-secondary button-default" to="/admin/recipes">
          Manage recipes
        </Link>
      </Panel>
    </Stack>
  )
}

function RecipeEnrichmentOperations() {
  const repository = useWeeklyPreparationAdminRepository()
  const [status, setStatus] = useState<RecipeEnrichmentBackfillStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const refreshSequence = useRef(0)

  const refresh = useCallback(async () => {
    if (!repository) return
    const sequence = ++refreshSequence.current
    try {
      const next = await repository.getRecipeEnrichmentStatus()
      if (sequence !== refreshSequence.current) return
      setStatus(next)
      setMessage('')
    } catch {
      if (sequence !== refreshSequence.current) return
      setMessage('Recipe enrichment progress could not be loaded. Try again.')
    }
  }, [repository])

  useEffect(() => {
    if (!repository) return
    const sequence = ++refreshSequence.current
    void repository
      .getRecipeEnrichmentStatus()
      .then((next) => {
        if (sequence !== refreshSequence.current) return
        setStatus(next)
        setMessage('')
      })
      .catch(() => {
        if (sequence !== refreshSequence.current) return
        setMessage('Recipe enrichment progress could not be loaded. Try again.')
      })
    return () => {
      refreshSequence.current += 1
    }
  }, [repository])

  useEffect(() => {
    if (!repository || !status) return
    const hasActiveWork = (status.states.pending ?? 0) > 0 || (status.states.processing ?? 0) > 0
    if (!hasActiveWork) return
    const timer = window.setInterval(() => void refresh(), 5_000)
    return () => window.clearInterval(timer)
  }, [refresh, repository, status])

  if (!repository) return null
  const adminRepository = repository

  async function command(
    action:
      | 'start'
      | 'pause'
      | 'resume'
      | 'retry_failed'
      | 'reprocess_ai'
      | 'recover_exhausted_ai_failures',
  ) {
    const confirmation =
      action === 'reprocess_ai'
        ? `Re-enrich eligible recipes with Recipe Intelligence AI? Provider usage is capped at A${status?.monthlyCostLimitAud.toFixed(2) ?? '0.00'} per month.`
        : action === 'start'
          ? 'Enrich eligible existing household and shared recipes?'
          : action === 'recover_exhausted_ai_failures'
            ? `Recover exactly ${status?.recoverableCount ?? 0} exhausted AI failures? Only failed provider-assisted jobs for each recipe’s latest version without an active successful enrichment will be reset.`
            : null
    if (confirmation && !window.confirm(confirmation)) return
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
            <table aria-label="Recipe enrichment status">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                <StatusRow
                  metric="Recipe Intelligence AI"
                  value={status.aiEnabled ? 'Enabled' : 'Disabled'}
                  details={status.paused ? 'Queue paused' : 'Queue available'}
                />
                <StatusRow
                  metric="Monthly provider limit"
                  value={`A$${status.monthlyCostLimitAud.toFixed(2)}`}
                  details="Maximum AI provider spend per month"
                />
                <StatusRow
                  metric="Household recipes"
                  value={`${status.sources.household.current} / ${status.sources.household.eligible}`}
                  details="Enriched / eligible"
                />
                <StatusRow
                  metric="Shared recipes"
                  value={`${status.sources.sharedPlatform.current} / ${status.sources.sharedPlatform.eligible}`}
                  details="Enriched / eligible"
                />
                <StatusRow
                  metric="Queued"
                  value={status.states.pending ?? 0}
                  details="Waiting to run"
                />
                <StatusRow
                  metric="Processing"
                  value={status.states.processing ?? 0}
                  details="Currently running"
                />
                <StatusRow
                  metric="Completed"
                  value={status.states.completed ?? 0}
                  details="Finished successfully"
                />
                <StatusRow
                  metric="Failed"
                  value={status.states.failed ?? 0}
                  details={
                    status.latestProviderFailure
                      ? [
                          `Latest AI error: HTTP ${status.latestProviderFailure.httpStatus}`,
                          status.latestProviderFailure.errorCode,
                          status.latestProviderFailure.errorParam,
                          status.latestProviderFailure.requestId
                            ? `Request ${status.latestProviderFailure.requestId}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : 'No current provider error'
                  }
                />
                <StatusRow
                  metric="Recoverable AI failures"
                  value={status.recoverableCount}
                  details="Exhausted current-version AI jobs eligible for recovery"
                />
                <StatusRow
                  metric="Rejected"
                  value={status.states.cancelled ?? 0}
                  details="Cancelled or rejected"
                />
              </tbody>
            </table>

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
              <Button
                variant="secondary"
                disabled={busy || status.recoverableCount === 0 || !status.aiEnabled}
                onClick={() => void command('recover_exhausted_ai_failures')}
              >
                Recover exhausted AI failures ({status.recoverableCount})
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
  const [evaluating, setEvaluating] = useState(false)
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

  async function refresh() {
    const [nextSettings, nextEvaluation] = await Promise.all([
      adminRepository.getSettings(),
      adminRepository.getLatestEvaluation(),
    ])
    setSettings(nextSettings)
    setEvaluation(nextEvaluation)
    setMessage('')
  }

  async function runEvaluation() {
    if (
      !window.confirm(
        'Run the internal 30-plan evaluation? This tests 30 example weekly plans, uses the configured provider for ambiguous cases and may incur bounded provider cost.',
      )
    )
      return
    setEvaluating(true)
    setMessage('')
    try {
      await adminRepository.runEvaluation()
      await refresh()
      setMessage('The 30-plan evaluation finished. Review the evidence before accepting it.')
    } catch {
      setMessage(
        'The 30-plan evaluation could not complete. Check configuration and hosted smoke readiness, then try again.',
      )
    } finally {
      setEvaluating(false)
    }
  }

  async function acceptEvaluation() {
    if (!evaluation || !window.confirm('Accept this exact completed evaluation?')) return
    setEvaluating(true)
    setMessage('')
    try {
      await adminRepository.acceptEvaluation(evaluation.id)
      await refresh()
      setMessage('Evaluation accepted. AI assistance still requires a separate confirmation.')
    } catch {
      setMessage('This evaluation cannot be accepted. Review failed or incomplete cases first.')
    } finally {
      setEvaluating(false)
    }
  }

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
      setMessage(
        next.aiEnabled
          ? 'AI assistance remains disabled. Complete the hosted smoke test, run and accept the current 30-plan evaluation, then try again.'
          : 'No weekly preparation controls were changed. Try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flow-stack" aria-labelledby="weekly-preparation-operations-title">
      <div>
        <h2 id="weekly-preparation-operations-title">Weekly preparation operations</h2>
        <p>Prove readiness, review evidence and activate model assistance in separate steps.</p>
      </div>
      <p aria-live="polite">{message}</p>
      <Panel>
        <h3>Release readiness</h3>
        <p>
          The 30-plan evaluation means 30 example weekly plans. It is not a 30-minute Get Ahead
          session.
        </p>
        <ol>
          <li>Configuration: {settings.modelIdentifier ? 'Ready' : 'Needs attention'}</li>
          <li>Hosted smoke test: {settings.smokeVerified ? 'Ready' : 'Not verified'}</li>
          <li>
            30-plan evaluation: {evaluation?.status === 'completed' ? 'Completed' : 'Not completed'}
          </li>
          <li>Evaluation acceptance: {evaluation?.accepted ? 'Accepted' : 'Not accepted'}</li>
          <li>Emergency stop: {settings.emergencyStop ? 'Active' : 'Clear'}</li>
          <li>AI assistance: {settings.aiEnabled ? 'Enabled' : 'Disabled'}</li>
        </ol>
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
            disabled={
              saving || settings.emergencyStop || !settings.smokeVerified || !evaluation?.accepted
            }
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
        {!settings.aiEnabled && (!settings.smokeVerified || !evaluation?.accepted) ? (
          <p>
            Enable AI assistance becomes available after the hosted smoke test and the current
            evaluation are accepted.
          </p>
        ) : null}
      </Panel>
      <Panel>
        <h3>30-plan evaluation</h3>
        <div className="cluster">
          <Button disabled={evaluating} onClick={() => void runEvaluation()}>
            {evaluating ? 'Running evaluation…' : 'Run 30-plan evaluation'}
          </Button>
          <Button
            variant="secondary"
            disabled={
              evaluating || !evaluation || evaluation.status !== 'completed' || evaluation.accepted
            }
            onClick={() => void acceptEvaluation()}
          >
            {evaluation?.accepted ? 'Evaluation accepted' : 'Accept evaluation'}
          </Button>
          <Button variant="secondary" disabled={evaluating} onClick={() => void refresh()}>
            Refresh readiness
          </Button>
        </div>
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

function StatusRow({
  metric,
  value,
  details,
}: {
  metric: string
  value: string | number
  details: string
}) {
  return (
    <tr>
      <th scope="row">{metric}</th>
      <td>{value}</td>
      <td>{details}</td>
    </tr>
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
