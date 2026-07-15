import { CookingPot } from 'lucide-react'

import { FeaturePlaceholderPage } from './FeaturePlaceholderPage'

export function PantryPage() {
  return (
    <FeaturePlaceholderPage
      description="A simple view of what the household keeps in the pantry, fridge and freezer."
      eyebrow="Your ingredients"
      icon={CookingPot}
      placeholderMessage="Pantry tracking begins in Milestone 11 after household data and canonical ingredients are ready."
      placeholderTitle="Nothing to organise here yet"
      title="Pantry"
    />
  )
}
