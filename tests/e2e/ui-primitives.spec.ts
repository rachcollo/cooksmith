import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const variant of ['dialog', 'sheet']) {
  test(`${variant}: raw numeric entry, vetoed close, nested confirmation and repeat reopening`, async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/tests/e2e/fixtures/ui-primitives/index.html${variant === 'sheet' ? '?sheet' : ''}`,
    )
    const trigger = page.getByRole('button', { name: 'Edit amount', exact: true })
    await trigger.click()
    const amount = page.getByRole('textbox', { name: 'Amount', exact: true })
    await expect(amount).toBeFocused()
    await amount.pressSequentially('1.')
    await expect(amount).toHaveValue('1.')
    await page.getByRole('button', { name: 'Save amount' }).click()
    await expect(page.getByRole('status')).toHaveText('Nothing saved')
    await amount.pressSequentially('5')
    await expect(amount).toHaveValue('1.5')
    await page.keyboard.press('Escape')
    const confirmation = page.getByRole('dialog', { name: 'Discard changes?' })
    await expect(confirmation).toBeVisible()
    await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Discard', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Close Discard changes?' })).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath('confirmation.png') })
    await page.keyboard.press('Escape')
    await expect(confirmation).not.toBeVisible()
    await expect(amount).toBeFocused()
    await expect(amount).toHaveValue('1.5')
    await page.getByRole('button', { name: 'Close Edit amount' }).click()
    await page.getByRole('button', { name: 'Keep editing' }).click()
    await expect(amount).toHaveValue('1.5')
    await page.getByRole('button', { name: 'Save amount' }).click()
    await expect(page.getByRole('status')).toHaveText('1.5')
    await expect(trigger).toBeFocused()
    for (const [raw, saved] of [
      ['0.5', '0.5'],
      ['0.25', '0.25'],
      ['1,5', '1.5'],
      ['1 1/2', '1.5'],
    ]) {
      await trigger.click()
      await amount.fill(raw!)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
      await page.getByRole('button', { name: 'Save amount' }).click()
      await expect(page.getByRole('status')).toHaveText(saved!)
      await expect(trigger).toBeFocused()
    }
    await trigger.click()
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    }
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(amount).toBeFocused()
  })
}
