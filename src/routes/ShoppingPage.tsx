import { ShoppingBasket } from 'lucide-react'

import { FeaturePlaceholderPage } from './FeaturePlaceholderPage'

export function ShoppingPage() {
  return (
    <FeaturePlaceholderPage
      description="Planned meals will become one tidy list that is easy to take to the shops."
      eyebrow="One useful list"
      icon={ShoppingBasket}
      placeholderMessage="Shopping lists arrive after meal plans and structured ingredients are dependable."
      placeholderTitle="Nothing to buy from Cooksmith yet"
      title="Shopping"
    />
  )
}
