import { lazy } from 'react'

export const HomePage = lazy(async () => {
  const module = await import('../../routes/HomePage')
  return { default: module.HomePage }
})

export const PantryPage = lazy(async () => {
  const module = await import('../../routes/PantryPage')
  return { default: module.PantryPage }
})

export const RecipesPage = lazy(async () => {
  const module = await import('../../routes/RecipesPage')
  return { default: module.RecipesPage }
})

export const PlanPage = lazy(async () => {
  const module = await import('../../routes/PlanPage')
  return { default: module.PlanPage }
})

export const GetAheadPage = lazy(async () => {
  const module = await import('../../routes/GetAheadPage')
  return { default: module.GetAheadPage }
})

export const ShoppingPage = lazy(async () => {
  const module = await import('../../routes/ShoppingPage')
  return { default: module.ShoppingPage }
})

export const SettingsPage = lazy(async () => {
  const module = await import('../../routes/SettingsPage')
  return { default: module.SettingsPage }
})

export const AdminPage = lazy(async () => {
  const module = await import('../../routes/AdminPage')
  return { default: module.AdminPage }
})

export const HealthPage = lazy(async () => {
  const module = await import('../../routes/HealthPage')
  return { default: module.HealthPage }
})

export const NotFoundPage = lazy(async () => {
  const module = await import('../../routes/NotFoundPage')
  return { default: module.NotFoundPage }
})
