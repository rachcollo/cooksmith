export type PantryItemCategory =
  | 'baking'
  | 'breakfast'
  | 'canned_and_jarred'
  | 'condiments_and_sauces'
  | 'grains_rice_and_pasta'
  | 'herbs_and_spices'
  | 'oils_and_vinegars'
  | 'snacks'
  | 'tea_coffee_and_drinks'
  | 'other'

export interface PantryItem {
  id: string
  householdId: string
  name: string
  category: PantryItemCategory
  quantity: number | null
  unit: string | null
  available: boolean
  isDefault: boolean
  updatedAt: string
}

export interface PantryItemInput {
  name: string
  category: PantryItemCategory
  quantity: number | null
  unit: string | null
  available: boolean
}

export const pantryCategoryLabels: Record<PantryItemCategory, string> = {
  baking: 'Baking',
  breakfast: 'Breakfast',
  canned_and_jarred: 'Canned and jarred',
  condiments_and_sauces: 'Condiments and sauces',
  grains_rice_and_pasta: 'Grains, rice and pasta',
  herbs_and_spices: 'Herbs and spices',
  oils_and_vinegars: 'Oils and vinegars',
  snacks: 'Snacks',
  tea_coffee_and_drinks: 'Tea, coffee and drinks',
  other: 'Other',
}
