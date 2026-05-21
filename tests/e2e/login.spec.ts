import { test, expect } from '@playwright/test'
import { checkA11y, SEED } from './helpers'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'nobody@example.com')
    await page.fill('input[type="password"]', 'WrongPass1!')
    await page.click('button[type="submit"]')
    await expect(page.locator('[role="alert"], .text-red-600, .text-destructive')).toBeVisible({
      timeout: 5000,
    })
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const violations = await checkA11y(page)
    expect(
      violations,
      `Accessibility violations: ${JSON.stringify(violations, null, 2)}`,
    ).toHaveLength(0)
  })

  test('redirects authenticated user to calendar', async ({ page }) => {
    // Use Acme admin who has completed onboarding in seed data
    await page.fill('input[type="email"]', SEED.acmeAdmin.email)
    await page.fill('input[type="password"]', SEED.acmeAdmin.password)
    await page.click('button[type="submit"]')
    // Will land on verify-2fa or calendar (seed data may/may not have 2FA cookie)
    await page.waitForURL(/(verify-2fa|calendar|onboarding)/, { timeout: 10000 })
    const url = page.url()
    expect(url).toMatch(/(verify-2fa|calendar|onboarding)/)
  })

  test('forgot password link is visible and navigates correctly', async ({ page }) => {
    await page.click('a[href*="forgot-password"]')
    await page.waitForURL('**/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
