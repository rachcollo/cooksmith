import { CalendarDays } from 'lucide-react'

import { FeaturePlaceholderPage } from './FeaturePlaceholderPage'

export function PlanPage() {
  return (
    <FeaturePlaceholderPage
      description="A practical fortnight view will make dinner decisions visible in one place."
      eyebrow="The next fortnight"
      icon={CalendarDays}
      placeholderMessage="Meal planning arrives after household preferences, pantry and recipes can support useful choices."
      placeholderTitle="No plan to fill in yet"
      title="Plan"
    />
  )
}
