import { Settings } from 'lucide-react'

import { FeaturePlaceholderPage } from './FeaturePlaceholderPage'

export function SettingsPage() {
  return (
    <FeaturePlaceholderPage
      description="Household preferences will be kept together without turning setup into paperwork."
      eyebrow="Make Cooksmith yours"
      icon={Settings}
      nextActionLabel="Check foundation status"
      nextActionPath="/health"
      placeholderMessage="Household and personal settings arrive with the approved onboarding milestones."
      placeholderTitle="No settings need your attention"
      title="Settings"
    />
  )
}
