import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoSeriousAccessibilityIssues(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
  ).toEqual([])
}

test('loads the v2 home and passes representative accessibility checks', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Dinner decisions, made lighter.' }),
  ).toBeVisible()
  await expect(page.getByText('v2 development preview')).toBeVisible()
  await expect(page).toHaveTitle('Home | Cooksmith')
  await expectNoSeriousAccessibilityIssues(page)
})

test('navigates directly through every primary route with titles and active states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })

  for (const route of [
    { label: 'Pantry', path: '/pantry' },
    { label: 'Recipes', path: '/recipes' },
    { label: 'Plan', path: '/plan' },
    { label: 'Shopping', path: '/shopping' },
    { label: 'Settings', path: '/settings' },
  ]) {
    await navigation.getByRole('link', { name: route.label, exact: true }).click()
    await expect(page).toHaveURL(route.path)
    await expect(page).toHaveTitle(`${route.label} | Cooksmith`)
    await expect(navigation.getByRole('link', { name: route.label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
  }

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
})

test('supports browser back and forward through real URLs', async ({ page }) => {
  await page.goto('/')
  await page.goto('/pantry')
  await page.goto('/recipes')

  await page.goBack()
  await expect(page).toHaveURL('/pantry')
  await page.goBack()
  await expect(page).toHaveURL('/')
  await page.goForward()
  await expect(page).toHaveURL('/pantry')
})

test('shows a useful not-found route with no serious accessibility issues', async ({ page }) => {
  await page.goto('/unknown-route')
  await expect(page.getByRole('heading', { name: 'Nothing cooking here' })).toBeVisible()
  await expect(page).toHaveTitle('Page not found | Cooksmith')
  await expectNoSeriousAccessibilityIssues(page)
  await page.getByRole('link', { name: 'Back to Cooksmith' }).click()
  await expect(page).toHaveURL('/')
})

test('uses mobile bottom navigation without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/pantry')

  await expect(page.getByRole('navigation', { name: 'Primary mobile navigation' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden()
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasOverflow).toBe(false)
  await expectNoSeriousAccessibilityIssues(page)
})

test('uses desktop navigation at larger widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary mobile navigation' })).toBeHidden()
})

test('keeps the tablet layout readable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/recipes')

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasOverflow).toBe(false)
  await expect(page.getByRole('heading', { level: 1, name: 'Recipes' })).toBeVisible()
})

test('exposes visible keyboard focus and a working skip link', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')

  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(skipLink).toBeFocused()
  const outlineStyle = await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outlineStyle).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('opens an accessible dialog, closes it and returns focus', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'About this preview' })

  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'What this preview proves' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close What this preview proves' })).toBeFocused()
  await expectNoSeriousAccessibilityIssues(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('respects reduced motion without breaking navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.setViewportSize({ width: 1280, height: 800 })

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await navigation.getByRole('link', { name: 'Plan', exact: true }).click()
  await expect(page).toHaveURL('/plan')
  const transitionDuration = await navigation.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  )
  expect(['0s', '0.00001s']).toContain(transitionDuration)
})
