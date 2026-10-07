import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('put-away review groups purchases and supports cancel, correction and partial application at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/tests/e2e/fixtures/put-away.html')
  const action = page.getByRole('button', { name: 'Put shopping away' })
  await expect(action).toBeVisible()
  await action.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Put shopping away' })
  await expect(dialog.getByRole('checkbox')).toHaveCount(2)
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(action).toBeVisible()
  await action.click()
  await dialog.getByRole('checkbox', { name: 'Include milk' }).uncheck()
  await dialog.getByRole('textbox', { name: 'Pantry name for apple' }).fill('Green apples')
  expect(
    (await new AxeBuilder({ page }).include('dialog').analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    ),
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'Put selected items away' }).click()
  await expect(page.getByText('1 Pantry item is now available.')).toBeVisible()
  await action.click()
  await expect(dialog.getByRole('checkbox')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Put selected items away' }).click()
  await expect(action).toBeHidden()
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    ),
  ).toEqual([])
})
