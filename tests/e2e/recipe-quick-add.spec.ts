import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const width of [320, 768, 1280]) {
  test(`quick-add visibly confirms today with keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.setFixedTime(new Date('2026-11-19T12:00:00Z'))
    await page.goto('/tests/e2e/fixtures/favourites.html')
    const add = page.getByRole('button', { name: 'Add Lentil soup to next available date' })
    await add.focus()
    await add.press('Enter')
    await expect(page.getByText('Lentil soup added to 19 November 2026.')).toBeVisible()
    await expect(add).toBeFocused()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
