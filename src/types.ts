export type Ingredient = { name: string; amount: string }
export type Recipe = { id: string; title: string; blurb: string; time: number; serves: number; tags: string[]; colour: string; emoji: string; ingredients: Ingredient[]; method: string[]; sourceUrl?: string; personal?: boolean }
export type PantryItem = { id: string; name: string; amount: string; checked?: boolean }
export type Plan = Record<string, string>
