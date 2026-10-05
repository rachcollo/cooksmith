import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('household favourites support keyboard, recovery and filtering at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/favourites.html?fail')
  const favourite = page.getByRole('button', { name: 'Favourite Lentil soup', exact: true })
  await favourite.focus()
  await favourite.press('Enter')
  await expect(page.getByText(/Your previous choice is restored/)).toBeVisible()
  await expect(favourite).toHaveAttribute('aria-pressed', 'false')
  await favourite.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Unfavourite Lentil soup', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Favourites', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search recipes' }).fill('lentil')
  await page.getByRole('button', { name: 'Open Lentil soup recipe' }).click()
  const detail = page.getByRole('dialog', { name: 'Lentil soup' })
  await expect(detail.getByRole('button', { name: 'Unfavourite Lentil soup' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await detail.getByRole('button', { name: 'Unfavourite Lentil soup' }).click()
  await detail.getByRole('button', { name: 'Close Lentil soup' }).click()
  await expect(page.getByRole('button', { name: 'Open Lentil soup recipe' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Favourites', exact: true }).click()
  await expect(favourite).toBeVisible()
})
