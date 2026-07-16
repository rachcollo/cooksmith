export type PantryStorageLocation = 'pantry' | 'fridge' | 'freezer'
export type PantryItemCategory =
  | 'staples'
  | 'baking'
  | 'canned_goods'
  | 'condiments'
  | 'spices'
  | 'fresh'
  | 'frozen'
  | 'drinks'
  | 'household'

export interface PantryItem {
  id: string
  householdId: string
  name: string
  category: PantryItemCategory
  storageLocation: PantryStorageLocation
  quantity: number
  unit: string
  available: boolean
  isDefault: boolean
  updatedAt: string
}

export interface PantryItemInput {
  name: string
  category: PantryItemCategory
  storageLocation: PantryStorageLocation
  quantity: number
  unit: string
  available: boolean
}

export const pantryCategoryLabels: Record<PantryItemCategory, string> = {
  staples: 'Staples',
  baking: 'Baking',
  canned_goods: 'Canned goods',
  condiments: 'Condiments',
  spices: 'Spices',
  fresh: 'Fresh',
  frozen: 'Frozen',
  drinks: 'Drinks',
  household: 'Household',
}

export const pantryStorageLabels: Record<PantryStorageLocation, string> = {
  pantry: 'Pantry',
  fridge: 'Fridge',
  freezer: 'Freezer',
}
