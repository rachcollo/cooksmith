import {
  BookOpen,
  CalendarDays,
  CookingPot,
  House,
  Settings,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react'

export const navigationItems = [
  { label: 'Home', path: '/', icon: House, end: true },
  { label: 'Pantry', path: '/pantry', icon: CookingPot, end: false },
  { label: 'Recipes', path: '/recipes', icon: BookOpen, end: false },
  { label: 'Plan', path: '/plan', icon: CalendarDays, end: false },
  { label: 'Shopping', path: '/shopping', icon: ShoppingBasket, end: false },
  { label: 'Get Ahead', path: '/get-ahead', icon: Sparkles, end: false },
  { label: 'Settings', path: '/settings', icon: Settings, end: false },
] as const

export const mobileNavigationItems = navigationItems.filter((item) => item.label !== 'Settings')
