import { useEffect, useRef, useState } from 'react'
import { useShoppingRepository } from '../../app/shopping/shoppingContext'
import { Panel } from '../../components/ui/Panel'
import { SelectField } from '../../components/ui/SelectField'
import { Button } from '../../components/ui/Button'
import { shoppingPresetLabels, type ShoppingPreset } from '../../domain/shopping/period'

export function ShoppingDefaultsSection({
  householdId,
  owner,
}: {
  householdId: string
  owner: boolean
}) {
  const repository = useShoppingRepository()
  const [preset, setPreset] = useState<ShoppingPreset | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    let current = true
    active.current = true
    if (repository.loadDefault)
      void repository
        .loadDefault(householdId)
        .then((value) => {
          if (current) setPreset(value)
        })
        .catch(() => {
          if (current) setError('Could not load the Shopping default.')
        })
    return () => {
      current = false
      active.current = false
    }
  }, [householdId, repository, retry])
  if (!repository.loadDefault || !repository.saveDefault) return null
  async function save(next: ShoppingPreset) {
    if (!owner || lock.current || !preset) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await repository.saveDefault!(householdId, next)
      if (active.current) {
        setPreset(next)
        setMessage('Shopping default saved.')
      }
    } catch {
      if (active.current)
        setError('Could not confirm the default. Reload Settings to check before trying again.')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  return (
    <Panel>
      <h2>Shopping</h2>
      <p>
        Your usual range. A choice made in Shopping lasts for the active week; it does not change
        this default.
      </p>
      {preset ? (
        <SelectField
          label="Default shopping period"
          value={preset}
          disabled={!owner || busy}
          onChange={(event) => void save(event.target.value as ShoppingPreset)}
        >
          {Object.entries(shoppingPresetLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
      ) : !error ? (
        <p role="status">Loading Shopping default…</p>
      ) : null}
      {!owner ? <p className="form-hint">A household owner can change this default.</p> : null}
      {busy || message ? <p role="status">{busy ? 'Saving default…' : message}</p> : null}
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      {!preset && error ? (
        <Button
          variant="secondary"
          onClick={() => {
            setError('')
            setRetry((value) => value + 1)
          }}
        >
          Try again
        </Button>
      ) : null}
    </Panel>
  )
}
