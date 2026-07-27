import { useEffect, useState, type FormEvent } from 'react'

import { useHouseholdPreferencesRepository } from '../app/households/householdPreferencesContext'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { FeedbackState } from '../components/ui/FeedbackState'
import { LoadingState } from '../components/ui/LoadingState'
import { TextField } from '../components/ui/TextField'
import {
  EMPTY_HOUSEHOLD_PREFERENCE_PROFILE,
  householdPreferenceProfileSchema,
  type HouseholdPreferenceProfile,
} from '../domain/households/preferences'

function split(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

function join(value: string[]) {
  return value.join(', ')
}

function hardConstraints(profile: HouseholdPreferenceProfile) {
  return JSON.stringify([
    profile.dietaryRequirements,
    profile.people.map(({ id, displayName, allergies, intolerances }) => ({
      id,
      displayName,
      allergies,
      intolerances,
    })),
  ])
}

export function HouseholdPreferencesSection({ householdId }: { householdId: string }) {
  const repository = useHouseholdPreferencesRepository()
  const [saved, setSaved] = useState<HouseholdPreferenceProfile | null>(null)
  const [draft, setDraft] = useState<HouseholdPreferenceProfile | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void repository
      .load(householdId)
      .then((profile) => {
        if (active) {
          setSaved(profile)
          setDraft(profile)
        }
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [householdId, repository])

  if (error)
    return (
      <ErrorState
        title="We couldn’t load your food preferences"
        message="Nothing has been changed. Reload the page to try again."
      />
    )
  if (!draft || !saved) return <LoadingState label="Loading household food preferences" />

  function set<K extends keyof HouseholdPreferenceProfile>(
    key: K,
    value: HouseholdPreferenceProfile[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
    setMessage('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = householdPreferenceProfileSchema.safeParse(draft)
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? 'Check the details and try again.')
      return
    }
    if (
      hardConstraints(saved!) !== hardConstraints(result.data) &&
      !window.confirm(
        'Save safety changes? Removing or changing an allergy, intolerance or dietary requirement may affect future recommendations.',
      )
    )
      return
    setBusy(true)
    setMessage('')
    try {
      const next = await repository.save(householdId, result.data)
      setSaved(next)
      setDraft(next)
      setMessage('Household preferences saved.')
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="people-section" aria-labelledby="food-preferences-heading">
      <div>
        <p className="eyebrow">Food and cooking</p>
        <h2 id="food-preferences-heading">Household preferences</h2>
        <p>
          Add as much or as little as is useful. Empty preferences never stop Cooksmith from
          working.
        </p>
      </div>
      {message ? (
        <FeedbackState
          tone={message.endsWith('saved.') ? 'success' : 'error'}
          title={message.endsWith('saved.') ? 'Saved' : 'We couldn’t save that'}
          message={message}
        />
      ) : null}
      <form className="preference-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="preference-group preference-safety">
          <legend>Must never include</legend>
          <p>
            Allergies, intolerances and dietary requirements are safety constraints. Cooksmith will
            never knowingly include them in future recommendations.
          </p>
          <TextField
            label="Household dietary requirements"
            hint="Separate items with commas, for example vegetarian, halal."
            optional
            value={join(draft.dietaryRequirements)}
            onChange={(event) => set('dietaryRequirements', split(event.target.value))}
          />
          <div className="preference-people">
            {draft.people.map((person, index) => (
              <fieldset key={person.id ?? index} className="preference-person">
                <legend>Person {index + 1}</legend>
                <TextField
                  label="Name"
                  value={person.displayName}
                  onChange={(event) =>
                    set(
                      'people',
                      draft.people.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, displayName: event.target.value } : item,
                      ),
                    )
                  }
                />
                <TextField
                  label="Allergies"
                  optional
                  value={join(person.allergies)}
                  onChange={(event) =>
                    set(
                      'people',
                      draft.people.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, allergies: split(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <TextField
                  label="Intolerances"
                  optional
                  value={join(person.intolerances)}
                  onChange={(event) =>
                    set(
                      'people',
                      draft.people.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, intolerances: split(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <Button
                  variant="quiet"
                  tone="destructive"
                  onClick={() =>
                    set(
                      'people',
                      draft.people.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove person
                </Button>
              </fieldset>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              set('people', [...draft.people, { displayName: '', allergies: [], intolerances: [] }])
            }
          >
            Add someone we cook for
          </Button>
        </fieldset>

        <fieldset className="preference-group">
          <legend>Things you enjoy</legend>
          <TextField
            label="Favourite cuisines"
            optional
            value={join(draft.favouriteCuisines)}
            onChange={(event) => set('favouriteCuisines', split(event.target.value))}
          />
          <TextField
            label="Foods you like"
            optional
            value={join(draft.likedFoods)}
            onChange={(event) => set('likedFoods', split(event.target.value))}
          />
          <TextField
            label="Foods you prefer to avoid"
            optional
            value={join(draft.avoidedFoods)}
            onChange={(event) => set('avoidedFoods', split(event.target.value))}
          />
        </fieldset>

        <fieldset className="preference-group">
          <legend>How you cook</legend>
          <label className="field">
            <span className="form-label">Cooking confidence</span>
            <select
              value={draft.cookingConfidence ?? ''}
              onChange={(event) =>
                set(
                  'cookingConfidence',
                  (event.target.value ||
                    undefined) as HouseholdPreferenceProfile['cookingConfidence'],
                )
              }
            >
              <option value="">No preference</option>
              <option value="beginner">Beginner</option>
              <option value="comfortable">Comfortable</option>
              <option value="confident">Confident</option>
            </select>
          </label>
          <label className="field">
            <span className="form-label">Typical weeknight cooking time</span>
            <select
              value={draft.weeknightTime ?? ''}
              onChange={(event) =>
                set(
                  'weeknightTime',
                  (event.target.value || undefined) as HouseholdPreferenceProfile['weeknightTime'],
                )
              }
            >
              <option value="">No preference</option>
              <option value="up_to_20">Up to 20 minutes</option>
              <option value="up_to_30">Up to 30 minutes</option>
              <option value="up_to_45">Up to 45 minutes</option>
              <option value="flexible">Flexible</option>
            </select>
          </label>
          <TextField
            label="Preferred grocery store"
            optional
            value={draft.preferredStore ?? ''}
            onChange={(event) => set('preferredStore', event.target.value)}
          />
        </fieldset>
        <div className="dialog-actions">
          <Button
            variant="quiet"
            onClick={() => {
              setSaved({ ...EMPTY_HOUSEHOLD_PREFERENCE_PROFILE })
              setDraft({ ...EMPTY_HOUSEHOLD_PREFERENCE_PROFILE })
            }}
          >
            Clear optional answers
          </Button>
          <Button type="submit" busy={busy} busyLabel="Saving preferences">
            Save preferences
          </Button>
        </div>
      </form>
    </section>
  )
}
