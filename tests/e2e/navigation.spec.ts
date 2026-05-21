import { test, expect } from '@playwright/test'
import { checkA11y } from './helpers'

/**
 * Navigation and redirect tests — verify the middleware routing rules.
 */
test.describe('Middleware redirects', () => {
  test('/ redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('/settings redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('/org-admin redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/org-admin/users')
    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('/super-admin redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/super-admin/orgs')
    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Public page rendering', () => {
  test('terms of service page renders', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('privacy policy page renders', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('404 handling for unknown routes', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist-at-all')
    // Either 404 or redirect to login
    expect([200, 301, 302, 404]).toContain(res?.status() ?? 200)
  })
})

test.describe('Mobile viewport — public pages', () => {
  test.use({ viewport: { width: 393, height: 852 } }) // iPhone 14 Pro

  test('login page renders correctly on mobile', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    const violations = await checkA11y(page)
    expect(violations, JSON.stringify(violations)).toHaveLength(0)
  })

  test('forgot password page renders on mobile', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
