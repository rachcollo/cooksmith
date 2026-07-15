import { BookOpen } from 'lucide-react'

import { FeaturePlaceholderPage } from './FeaturePlaceholderPage'

export function RecipesPage() {
  return (
    <FeaturePlaceholderPage
      description="Public and personal recipes will live here with clear chef attribution."
      eyebrow="Things worth cooking"
      icon={BookOpen}
      placeholderMessage="Recipe browsing arrives after the recipe, chef and image foundations are complete."
      placeholderTitle="The recipe shelf is being prepared"
      title="Recipes"
    />
  )
}
