import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Run axe accessibility audit and return violations.
 * Fails the test if any WCAG 2.1 AA violations found.
 */
export async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  return results.violations
}

/** Seed user credentials (must match supabase/seed.sql) */
export const SEED = {
  superAdmin: { email: 'superadmin@nanospaces.app', password: 'NanoSeed2024!' },
  acmeAdmin: { email: 'alice.admin@acmecorp.example', password: 'NanoSeed2024!' },
  acmeUser: { email: 'bob.smith@acmecorp.example', password: 'NanoSeed2024!' },
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait for either 2FA page or calendar (seed users have 2FA enrolled)
  await page.waitForURL(/(verify-2fa|calendar|onboarding)/, { timeout: 10000 })
}

export async function logout(page: Page) {
  // POST to logout endpoint
  await page.request.post('/api/auth/logout')
  await page.goto('/login')
}
