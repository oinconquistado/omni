import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'admin@omni.com')
    await page.fill('[data-testid="password-input"]', 'adminpassword')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display dashboard overview', async ({ page }) => {
    await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-clients"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="system-health"]')).toBeVisible()
  })

  test('should show client statistics', async ({ page }) => {
    await expect(page.locator('[data-testid="client-stats"]')).toBeVisible()
    await expect(page.locator('[data-testid="trial-clients"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-clients"]')).toBeVisible()
    await expect(page.locator('[data-testid="suspended-clients"]')).toBeVisible()
  })

  test('should display recent activities', async ({ page }) => {
    await expect(page.locator('[data-testid="recent-activities"]')).toBeVisible()
    
    const activityItems = await page.locator('[data-testid="activity-item"]').count()
    expect(activityItems).toBeGreaterThanOrEqual(0)
  })

  test('should show system alerts', async ({ page }) => {
    await expect(page.locator('[data-testid="system-alerts"]')).toBeVisible()
    
    const alertCount = await page.locator('[data-testid="alert-item"]').count()
    expect(alertCount).toBeGreaterThanOrEqual(0)
  })

  test('should navigate to different sections', async ({ page }) => {
    await page.click('[data-testid="clients-nav"]')
    await expect(page).toHaveURL('/clients')
    
    await page.click('[data-testid="users-nav"]')
    await expect(page).toHaveURL('/users')
    
    await page.click('[data-testid="dashboard-nav"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display performance metrics', async ({ page }) => {
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="response-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-rate"]')).toBeVisible()
    await expect(page.locator('[data-testid="uptime"]')).toBeVisible()
  })

  test('should show quick actions', async ({ page }) => {
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-client-action"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-user-action"]')).toBeVisible()
    await expect(page.locator('[data-testid="system-settings-action"]')).toBeVisible()
  })

  test('should refresh dashboard data', async ({ page }) => {
    await page.click('[data-testid="refresh-dashboard"]')
    
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible()
  })
})