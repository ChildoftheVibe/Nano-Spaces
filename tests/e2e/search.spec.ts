import { test, expect } from '@playwright/test'

/**
 * Global search E2E tests.
 * These verify the search component behavior at the page level.
 */
test.describe('Global Search', () => {
  test('search is not visible on public pages', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    // The global search component is only rendered in authenticated layouts
    const searchButton = page.locator('[data-testid="global-search"], button:has-text("Search")')
    await expect(searchButton).toHaveCount(0)
  })

  test('calendar page redirects to login (search not exposed unauthenticated)', async ({
    page,
  }) => {
    await page.goto('/calendar')
    await page.waitForURL('**/login**')
    expect(page.url()).toContain('login')
  })

  test('Cmd+K has no effect on login page (no search mounted)', async ({ page }) => {
    await page.goto('/login')
    await page.keyboard.press('Meta+k')
    // Should not open any search dialog
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toHaveCount(0)
  })
})
