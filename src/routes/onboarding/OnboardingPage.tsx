import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../app/auth/authContext'
import { useOnboarding } from '../../app/onboarding/onboardingContext'
import { Stack } from '../../components/layout/LayoutPrimitives'
import { Button } from '../../components/ui/Button'
import { FormError, FormHint } from '../../components/ui/FormField'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import {
  dietaryPreferencesSchema,
  householdNameSchema,
  householdPreferencesSchema,
  profileDetailsSchema,
} from '../../domain/onboarding/validationSchemas'
import type { DietaryPreferences } from '../../domain/onboarding/types'
import { DocumentTitle } from '../../app/router/DocumentTitle'

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten free', 'Dairy free']
const ALLERGY_OPTIONS = ['Peanuts', 'Tree nuts', 'Milk', 'Egg', 'Wheat', 'Soy', 'Fish', 'Shellfish']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Progress({ step }: { step: number }) {
  return (
    <div aria-label={`Onboarding step ${step} of 5`} className="onboarding-progress">
      <span>Step {step} of 5</span>
      <progress max="5" value={step} />
    </div>
  )
}

function Intro({ children, title }: { children: string; title: string }) {
  return (
    <header className="onboarding-heading">
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  )
}

function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function ProfileStep() {
  const { user } = useAuth()
  const { repository, state, refresh } = useOnboarding()
  const action = useAction()
  const defaultTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Melbourne',
    [],
  )
  const [displayName, setDisplayName] = useState(state.profile?.displayName ?? '')
  const [timezone, setTimezone] = useState(state.profile?.timezone ?? defaultTimezone)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    const result = profileDetailsSchema.safeParse({ displayName, timezone, locale: 'en-AU' })
    if (!result.success)
      return action.run(async () =>
        Promise.reject(new Error(result.error.issues[0]?.message ?? 'Check your profile details.')),
      )
    await action.run(async () => {
      await repository.saveProfile(user.id, result.data)
      await refresh()
    })
  }

  return (
    <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
      <Intro title="First, tell us about you">
        This keeps times and planning suggestions useful.
      </Intro>
      <TextField
        label="Display name"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <TextField
        label="Timezone"
        required
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        hint="Detected from this device. You can change it if needed."
      />
      {action.error ? <FormError>{action.error}</FormError> : null}
      <Button type="submit" busy={action.busy}>
        Continue
      </Button>
    </form>
  )
}

function HouseholdStep() {
  const { repository, state, refresh } = useOnboarding()
  const action = useAction()
  const [name, setName] = useState(state.householdName ?? '')
  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = householdNameSchema.safeParse({ name })
    if (!result.success)
      return action.run(async () =>
        Promise.reject(new Error(result.error.issues[0]?.message ?? 'Check the household name.')),
      )
    await action.run(async () => {
      await repository.bootstrapHousehold(result.data.name)
      await refresh()
    })
  }
  return (
    <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
      <Intro title="Create your household">
        A household keeps shared preferences and future meal planning together.
      </Intro>
      <TextField
        label="Household name"
        hint="For example, The Smith household"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {action.error ? <FormError>{action.error}</FormError> : null}
      <Button type="submit" busy={action.busy}>
        Create household
      </Button>
    </form>
  )
}

function PreferencesStep() {
  const { user } = useAuth()
  const { repository, state, refresh } = useOnboarding()
  const action = useAction()
  const [servings, setServings] = useState(String(state.preferences?.defaultServings ?? 4))
  const [weeknight, setWeeknight] = useState(String(state.preferences?.weeknightMaxMinutes ?? 30))
  const [weekend, setWeekend] = useState(String(state.preferences?.weekendMaxMinutes ?? 60))
  const [skill, setSkill] = useState<string>(state.preferences?.cookingSkill ?? 'confident')
  const [budget, setBudget] = useState<string>(state.preferences?.budgetBand ?? 'standard')
  const [store, setStore] = useState(state.preferences?.defaultStore ?? '')
  const [planningDay, setPlanningDay] = useState(
    String(state.preferences?.preferredPlanningDay ?? 0),
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user || !state.householdId) return
    const result = householdPreferencesSchema.safeParse({
      defaultServings: Number(servings),
      weeknightMaxMinutes: Number(weeknight),
      weekendMaxMinutes: Number(weekend),
      cookingSkill: skill,
      budgetBand: budget,
      defaultStore: store,
      preferredPlanningDay: Number(planningDay),
    })
    if (!result.success)
      return action.run(async () =>
        Promise.reject(new Error('Check each preference and try again.')),
      )
    await action.run(async () => {
      await repository.saveHouseholdPreferences(user.id, state.householdId!, result.data)
      await refresh()
    })
  }

  return (
    <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
      <Intro title="Make planning fit real life">
        Choose practical defaults. Everything can be changed later.
      </Intro>
      <div className="onboarding-grid">
        <TextField
          label="Default servings"
          type="number"
          min="1"
          max="20"
          required
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
        <TextField
          label="Weeknight cooking limit (minutes)"
          type="number"
          min="5"
          max="240"
          required
          value={weeknight}
          onChange={(e) => setWeeknight(e.target.value)}
        />
        <TextField
          label="Weekend cooking limit (minutes)"
          type="number"
          min="5"
          max="480"
          required
          value={weekend}
          onChange={(e) => setWeekend(e.target.value)}
        />
        <SelectField
          label="Cooking confidence"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="confident">Confident</option>
          <option value="experienced">Experienced</option>
        </SelectField>
        <SelectField
          label="Grocery budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        >
          <option value="economy">Keep costs low</option>
          <option value="standard">Balanced</option>
          <option value="flexible">Flexible</option>
        </SelectField>
        <TextField
          label="Preferred supermarket (optional)"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        />
        <SelectField
          label="Weekly planning day"
          value={planningDay}
          onChange={(e) => setPlanningDay(e.target.value)}
        >
          {DAYS.map((day, index) => (
            <option value={index} key={day}>
              {day}
            </option>
          ))}
        </SelectField>
      </div>
      {action.error ? <FormError>{action.error}</FormError> : null}
      <Button type="submit" busy={action.busy}>
        Save preferences
      </Button>
    </form>
  )
}

function ChoiceGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string
  options: string[]
  selected: string[]
  onChange(values: string[]): void
}) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <FormHint>Select all that apply. Choose none if there are no restrictions.</FormHint>
      <div className="choice-grid">
        {options.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((value) => value !== option),
                )
              }
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function DietaryStep({ onFinished }: { onFinished(): void }) {
  const { user } = useAuth()
  const { repository, state } = useOnboarding()
  const action = useAction()
  const [requirements, setRequirements] = useState<string[]>(
    state.dietary?.requirements.filter((value) => DIETARY_OPTIONS.includes(value)) ?? [],
  )
  const [allergies, setAllergies] = useState<string[]>(
    state.dietary?.allergies.filter((value) => ALLERGY_OPTIONS.includes(value)) ?? [],
  )
  const [otherRequirement, setOtherRequirement] = useState(
    state.dietary?.requirements.filter((value) => !DIETARY_OPTIONS.includes(value)).join(', ') ??
      '',
  )
  const [otherAllergy, setOtherAllergy] = useState(
    state.dietary?.allergies.filter((value) => !ALLERGY_OPTIONS.includes(value)).join(', ') ?? '',
  )
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user || !state.householdId) return
    const additionalRequirements = otherRequirement
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const additionalAllergies = otherAllergy
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const result = dietaryPreferencesSchema.safeParse({
      requirements: [...new Set([...requirements, ...additionalRequirements])],
      allergies: [...new Set([...allergies, ...additionalAllergies])],
    })
    if (!result.success) return
    await action.run(async () => {
      await repository.completeDietaryPreferences(
        user.id,
        state.householdId!,
        result.data as DietaryPreferences,
      )
      onFinished()
    })
  }
  return (
    <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
      <Intro title="Keep every meal suitable">
        Allergies are treated as hard exclusions, not suggestions.
      </Intro>
      <ChoiceGroup
        legend="Dietary preferences"
        options={DIETARY_OPTIONS}
        selected={requirements}
        onChange={setRequirements}
      />
      <TextField
        label="Other dietary preferences (optional)"
        hint="Separate more than one with commas."
        value={otherRequirement}
        onChange={(event) => setOtherRequirement(event.target.value)}
      />
      <ChoiceGroup
        legend="Allergies"
        options={ALLERGY_OPTIONS}
        selected={allergies}
        onChange={setAllergies}
      />
      <TextField
        label="Other allergies (optional)"
        hint="Separate more than one with commas. Cooksmith uses these as planning exclusions, not medical advice."
        value={otherAllergy}
        onChange={(event) => setOtherAllergy(event.target.value)}
      />
      {action.error ? <FormError>{action.error}</FormError> : null}
      <Button type="submit" busy={action.busy}>
        Finish setup
      </Button>
    </form>
  )
}

function CompletionStep({ onEnter }: { onEnter(): Promise<void> }) {
  const { updatePassword } = useAuth()
  const action = useAction()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        throw new Error('Use at least 10 characters, including a letter and a number.')
      }
      if (password !== confirmation) throw new Error('The passwords do not match.')
      await updatePassword(password)
      await onEnter()
    })
  }

  async function skip() {
    await action.run(onEnter)
  }

  return (
    <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
      <Intro title="You’re ready to cook lighter">
        Add a password if you would also like to sign in that way, or skip this step and keep using
        secure email links.
      </Intro>
      <TextField
        autoComplete="new-password"
        hint="Use at least 10 characters, including a letter and a number."
        label="Create a password"
        minLength={10}
        required
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField
        autoComplete="new-password"
        label="Confirm password"
        minLength={10}
        required
        type="password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      {action.error ? <FormError>{action.error}</FormError> : null}
      <Button busy={action.busy} type="submit">
        Set password and enter Cooksmith
      </Button>
      <Button disabled={action.busy} onClick={() => void skip()} variant="secondary">
        Skip for now
      </Button>
    </form>
  )
}

export function OnboardingPage() {
  const { state, refresh } = useOnboarding()
  const navigate = useNavigate()
  const [finished, setFinished] = useState(false)
  const step = finished ? 5 : state.step
  const card = useRef<HTMLElement>(null)

  useEffect(() => {
    card.current?.focus()
  }, [step])

  async function enterCooksmith() {
    await refresh()
    navigate('/', { replace: true })
  }

  return (
    <main className="onboarding-shell" id="main-content">
      <DocumentTitle title="Set up Cooksmith" />
      <a className="brand" href="/onboarding">
        <span className="brand-mark" aria-hidden="true">
          C
        </span>
        <strong>Cooksmith</strong>
      </a>
      <section aria-label="Cooksmith setup" className="onboarding-card" ref={card} tabIndex={-1}>
        <Stack gap="large">
          <Progress step={step} />
          {step === 1 ? <ProfileStep /> : null}
          {step === 2 ? <HouseholdStep /> : null}
          {step === 3 ? <PreferencesStep /> : null}
          {step === 4 ? <DietaryStep onFinished={() => setFinished(true)} /> : null}
          {step === 5 ? <CompletionStep onEnter={enterCooksmith} /> : null}
        </Stack>
      </section>
    </main>
  )
}
