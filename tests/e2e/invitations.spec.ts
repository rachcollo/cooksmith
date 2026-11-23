import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('invitation landing is passive, private and keyboard accessible across refresh and auth continuation', async ({
  page,
}) => {
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && /auth\/v1|functions\/v1|rest\/v1/.test(request.url()))
      writes.push(request.url())
  })
  await page.goto(`/invitations/accept?token=${'a'.repeat(64)}`)
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible()
  await expect.poll(() => new URL(page.url()).search).toBe('')
  expect(writes).toEqual([])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'),
  ).toEqual([])
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false)
  }
  await page.getByRole('button', { name: 'Accept invitation' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/welcome\?returnTo=%2Finvitations%2Faccept$/)
  expect(writes).toEqual([])
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(/\/auth\/create-account\?returnTo=%2Finvitations%2Faccept$/)
  expect(writes).toEqual([])
})

test('malformed invitation cannot reuse a previous pending token', async ({ page }) => {
  await page.goto(`/invitations/accept?token=${'a'.repeat(64)}`)
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible()
  await page.goto('/invitations/accept?token=invalid')
  await expect(page.getByText('Open your invitation email')).toBeVisible()
  await expect.poll(() => new URL(page.url()).search).toBe('')
  await page.reload()
  await expect(page.getByText('Open your invitation email')).toBeVisible()
})
