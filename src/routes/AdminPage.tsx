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
    </Stack>
  )
}
