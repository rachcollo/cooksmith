import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('loads the v2 shell with no automatically detectable accessibility issues', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'A calmer way to answer, “What’s for dinner?”',
    }),
  ).toBeVisible()
  await expect(page.getByText('v2 development preview')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('serves health and not-found states through the application shell', async ({ page }) => {
  await page.goto('/health')
  await expect(page.getByRole('heading', { name: 'The forge is ready.' })).toBeVisible()

  await page.goto('/unknown-route')
  await expect(page.getByRole('heading', { name: 'Nothing cooking here' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Cooksmith' }).click()
  await expect(page).toHaveURL('/')
})
