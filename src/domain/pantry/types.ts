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
  | 'produce'
  | 'dairy'
  | 'meat_and_seafood'
  | 'bakery'
  | 'frozen'
  | 'household'
  | 'other'
  | 'uncategorised'

export type PantryStorageLocation =
  'pantry' | 'fridge' | 'freezer' | 'produce_storage' | 'household_supplies' | 'other'

export type PantryClassificationSource = 'automatic' | 'explicit'

export interface PantryItem {
  id: string
  householdId: string
  name: string
  category: PantryItemCategory
  categorySource: PantryClassificationSource
  storageLocation: PantryStorageLocation
  storageLocationSource: PantryClassificationSource
  classificationVersion: number | null
  quantity: number | null
  unit: string | null
  available: boolean
  isDefault: boolean
  updatedAt: string
}

export interface PantryItemInput {
  name: string
  category: PantryItemCategory
  categorySource: PantryClassificationSource
  storageLocation: PantryStorageLocation
  storageLocationSource: PantryClassificationSource
  classificationVersion: number | null
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
  produce: 'Produce',
  dairy: 'Dairy',
  meat_and_seafood: 'Meat and seafood',
  bakery: 'Bakery',
  frozen: 'Frozen',
  household: 'Household',
  other: 'Other',
  uncategorised: 'Uncategorised',
}

export const pantryStorageLocationLabels: Record<PantryStorageLocation, string> = {
  pantry: 'Pantry',
  fridge: 'Fridge',
  freezer: 'Freezer',
  produce_storage: 'Produce storage',
  household_supplies: 'Household supplies',
  other: 'Other',
}
