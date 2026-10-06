import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { useOnboarding } from '../onboarding/onboardingContext'
import { useShoppingRepository } from '../shopping/shoppingContext'
import { useFeatureFlagRepository } from './featureFlagContext'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { ingredientStructureRulesVersion } from '../../domain/recipes/ingredientStructure'

export function ShoppingMaintenance() {
  const { user } = useAuth()
  const { state } = useOnboarding()
  return state.householdId ? (
    <HouseholdRepair key={`${user?.id}:${state.householdId}`} householdId={state.householdId} />
  ) : null
}

function HouseholdRepair({ householdId }: { householdId: string }) {
  const shopping = useShoppingRepository()
  const permissions = useFeatureFlagRepository()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  if (!shopping.refreshStructure) return null
  async function repair() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setMessage('')
    try {
      // The Admin route is protected; recheck before this operator action as well.
      const allowed = await permissions.isAdmin()
      if (!active.current) return
      if (!allowed) {
        setMessage('Administrator access is required. No repair was started.')
        return
      }
      const result = await shopping.refreshStructure!(householdId)
      if (!active.current) return
      setMessage(
        result.skipped
          ? `Updated ${result.refreshed} ${result.refreshed === 1 ? 'meal' : 'meals'}. ${result.skipped} ${result.skipped === 1 ? 'meal was' : 'meals were'} skipped or deferred; repair is not complete. Review source matches before retrying.`
          : result.refreshed
            ? `Updated ${result.refreshed} ${result.refreshed === 1 ? 'meal' : 'meals'}. Household edits and bought items were preserved.`
            : 'No older recipe amounts need repair. No purchases were changed.',
      )
    } catch {
      if (active.current)
        setMessage(
          'Repair could not finish. Reload this Admin page before retrying. Household edits and bought items remain protected.',
        )
    } finally {
      pending.current = false
      if (active.current) setBusy(false)
    }
  }
  return (
    <Panel>
      <h2>Shopping release maintenance</h2>
      <p>
        Use only after an ingredient-processing release. Repairs this household’s older recipe
        amounts, up to 100 meals per run. It does not edit recipes or restore removed purchases.
      </p>
      <p>
        Contract: {ingredientStructureRulesVersion}. Nothing runs automatically when you open this
        page.
      </p>
      <Button variant="secondary" busy={busy} onClick={() => void repair()}>
        Repair older Shopping amounts
      </Button>
      {message ? <p role="status">{message}</p> : null}
    </Panel>
  )
}
