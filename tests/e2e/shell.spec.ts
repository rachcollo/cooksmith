import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoSeriousAccessibilityIssues(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
  ).toEqual([])
}

test('protects application routes and preserves a safe return destination', async ({ page }) => {
  await page.goto('/recipes')
  await expect(page).toHaveURL(/\/welcome\?returnTo=%2Frecipes/)
  await expect(page.getByRole('heading', { name: 'Welcome to Cooksmith' })).toBeVisible()
  await expectNoSeriousAccessibilityIssues(page)
})

test('renders every public authentication screen', async ({ page }) => {
  for (const route of [
    ['/welcome', 'Welcome to Cooksmith'],
    ['/auth/sign-in', 'Sign in'],
    ['/auth/create-account', 'Create account'],
    ['/auth/magic-link', 'Get a magic link'],
    ['/auth/forgot-password', 'Reset your password'],
  ]) {
    await page.goto(route[0])
    await expect(page.getByRole('heading', { level: 1, name: route[1] })).toBeVisible()
  }
})

test('auth forms have labels, keyboard focus, and no serious accessibility issues', async ({
  page,
}) => {
  await page.goto('/auth/sign-in')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Cooksmith' })).toBeFocused()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expectNoSeriousAccessibilityIssues(page)
})

test('auth layout remains usable at mobile and tablet widths', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/auth/create-account')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false)
  }
})

test('rejects an external return destination', async ({ page }) => {
  await page.goto('/welcome?returnTo=https://evil.example')
  await page.getByRole('link', { name: 'Sign in with a password' }).click()
  await expect(page).toHaveURL(/returnTo=%2F/)
})

test('keeps the health endpoint public', async ({ page }) => {
  await page.goto('/health')
  await expect(page.getByRole('heading', { name: 'The forge is ready.' })).toBeVisible()
})
