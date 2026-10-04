export type ShoppingCategory =
  | 'produce'
  | 'meat_and_seafood'
  | 'dairy_and_eggs'
  | 'bakery'
  | 'pantry'
  | 'frozen'
  | 'household'
  | 'other'

export interface ShoppingItem {
  id: string
  householdId: string
  name: string
  quantity: number | null
  unit: string | null
  category: ShoppingCategory
  completed: boolean
  position: number
  updatedAt: string
  manual?: boolean
  sourceQuantities?: ShoppingSourceQuantity[]
}

export interface ShoppingSourceQuantity {
  purchaseName?: string
  name: string
  quantity: string | number | null
  unit: string | null
}

export interface ShoppingItemInput {
  name: string
  quantity: number | null
  unit: string | null
  category: ShoppingCategory
  sourceQuantities?: ShoppingSourceQuantity[]
}

export const shoppingCategoryLabels: Record<ShoppingCategory, string> = {
  produce: 'Fruit and vegetables',
  meat_and_seafood: 'Meat and seafood',
  dairy_and_eggs: 'Dairy and eggs',
  bakery: 'Bakery',
  pantry: 'Pantry',
  frozen: 'Frozen',
  household: 'Household',
  other: 'Other',
}
