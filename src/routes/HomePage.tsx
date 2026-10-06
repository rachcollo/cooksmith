import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnboarding } from '../app/onboarding/onboardingContext'
import { useAuth } from '../app/auth/authContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useShoppingRepository } from '../app/shopping/shoppingContext'
import { useWeeklyPreparationRepository } from '../app/get-ahead/weeklyPreparationContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { ResponsiveGrid, Stack } from '../components/layout/LayoutPrimitives'
import { Card } from '../components/ui/Panel'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import {
  addDays,
  currentWeek,
  formatDayLabel,
  formatWeekRange,
  toLocalIsoDate,
} from '../domain/meal-plans/week'
import { displayTitleForPlannedMeal } from '../domain/meal-plans/recipeLinks'
import { groupShoppingPurchases, type ShoppingPurchase } from '../domain/shopping/purchaseGroups'
import type { PlannedMeal } from '../domain/meal-plans/types'

type Section<T> = { kind: 'ready'; data: T } | { kind: 'error' }
type Summary = { meals: Section<PlannedMeal[]>; purchases: Section<ShoppingPurchase[]> }

export function HomePage() {
  const { state } = useOnboarding()
  const { user } = useAuth()
  return (
    <Stack gap="large" className="home-overview">
      <DocumentTitle title="Home" />
      <PageHeader
        title="Dinner decisions, made lighter."
        eyebrow="Your household"
        description="Your plan and shopping, in one place."
      />
      {state.householdId ? (
        <HouseholdOverview
          key={`${user?.id}:${state.householdId}`}
          householdId={state.householdId}
        />
      ) : (
        <Card>
          <h2>Make yourself at home</h2>
          <Link className="button button-primary" to="/onboarding">
            Set up your household
          </Link>
        </Card>
      )}
    </Stack>
  )
}

function HouseholdOverview({ householdId }: { householdId: string }) {
  const planner = usePlannedMealRepository()
  const shopping = useShoppingRepository()
  const preparation = useWeeklyPreparationRepository()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [attempt, setAttempt] = useState(0)
  const weekStart = currentWeek()
  const today = toLocalIsoDate(new Date())
  useEffect(() => {
    let active = true
    void Promise.allSettled([
      planner.listWeek(householdId, weekStart, addDays(weekStart, 6)),
      shopping.list(householdId),
    ]).then(([meals, purchases]) => {
      if (!active) return
      setSummary({
        meals:
          meals.status === 'fulfilled' ? { kind: 'ready', data: meals.value } : { kind: 'error' },
        purchases:
          purchases.status === 'fulfilled'
            ? { kind: 'ready', data: groupShoppingPurchases(purchases.value) }
            : { kind: 'error' },
      })
    })
    return () => {
      active = false
    }
  }, [householdId, planner, shopping, weekStart, attempt])
  if (!summary) return <LoadingState label="Loading your household overview" />
  const meals = summary.meals.kind === 'ready' ? summary.meals.data : []
  const next = meals
    .filter((meal) => meal.mealDate >= today)
    .sort((a, b) => a.mealDate.localeCompare(b.mealDate))[0]
  const purchases = summary.purchases.kind === 'ready' ? summary.purchases.data : []
  const bought = purchases.filter((item) => item.completed).length
  // Freezer provenance is optional on the accepted-main contract; prepared stock needs no prep.
  const canPrepare =
    preparation &&
    meals.some(
      (meal) =>
        meal.mealDate >= today &&
        meal.recipeState.kind === 'active' &&
        !('freezerMealId' in meal && meal.freezerMealId),
    )
  const retry = () => {
    setSummary(null)
    setAttempt((value) => value + 1)
  }
  return (
    <ResponsiveGrid className="home-overview-grid" minimum="18rem" aria-label="Household overview">
      <Card>
        <h2>This week's plan</h2>
        <p>{formatWeekRange(weekStart)}</p>
        {summary.meals.kind === 'error' ? (
          <ErrorState
            title="Your plan couldn’t load"
            message="You can still open Plan or try again."
            actionLabel="Try again"
            onAction={retry}
          />
        ) : (
          <>
            {next ? (
              <p className="home-next-meal">
                <span>{next.mealDate === today ? 'Today' : formatDayLabel(next.mealDate)}</span>
                <strong>{displayTitleForPlannedMeal(next)}</strong>
              </p>
            ) : (
              <p>
                {meals.length
                  ? 'No more meals planned this week.'
                  : 'Choose your first meal to get the week started.'}
              </p>
            )}
            {meals.length > 0 ? (
              <p>
                {meals.length} {meals.length === 1 ? 'meal' : 'meals'} planned this week.
              </p>
            ) : null}
          </>
        )}
        <Link className="button button-primary" to="/plan">
          {meals.length ? 'Open your plan' : 'Plan a meal'}
        </Link>
        {summary.meals.kind === 'ready' && !meals.length ? (
          <Link className="button button-secondary" to="/recipes">
            Find a recipe
          </Link>
        ) : null}
      </Card>
      <Card>
        <h2>Shopping</h2>
        {summary.purchases.kind === 'error' ? (
          <ErrorState
            title="Shopping progress couldn’t load"
            message="Your list is safe. Open Shopping or try again."
            actionLabel="Try again"
            onAction={retry}
          />
        ) : purchases.length ? (
          <>
            <p>
              {bought} of {purchases.length} purchases bought · across all dates.
            </p>
            <p>
              {bought === purchases.length
                ? 'Everything on your list is bought.'
                : `${purchases.length - bought} left to pick up.`}
            </p>
          </>
        ) : (
          <p>Your list is empty. Plan a recipe or add what you need.</p>
        )}
        <Link className="button button-secondary" to="/shopping">
          Open shopping list
        </Link>
      </Card>
      {canPrepare ? (
        <Card>
          <h2>Get Ahead</h2>
          <p>Check what you can prepare for your planned recipes.</p>
          <Link className="button button-secondary" to="/get-ahead">
            Review preparation
          </Link>
        </Card>
      ) : null}
      <Card>
        <h2>Use what you have</h2>
        <p>Check Pantry before you shop or choose your next meal.</p>
        <Link className="button button-secondary" to="/pantry">
          Check Pantry
        </Link>
      </Card>
    </ResponsiveGrid>
  )
}
