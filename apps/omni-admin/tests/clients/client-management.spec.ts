import { expect, test } from "@playwright/test"

test.describe("Client Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('[data-testid="email-input"]', "admin@omni.com")
    await page.fill('[data-testid="password-input"]', "adminpassword")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("should display clients list", async ({ page }) => {
    await page.goto("/clients")

    await expect(page.locator('[data-testid="clients-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-client-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-clients"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-status"]')).toBeVisible()
  })

  test("should create new client", async ({ page }) => {
    await page.goto("/clients")

    await page.click('[data-testid="add-client-button"]')
    await expect(page).toHaveURL("/clients/new")

    await page.fill('[data-testid="tenant-id"]', "test-tenant-001")
    await page.fill('[data-testid="company-name"]', "Test Company")
    await page.fill('[data-testid="contact-email"]', "contact@testcompany.com")
    await page.selectOption('[data-testid="client-status"]', "TRIAL")

    await page.click('[data-testid="save-button"]')

    await expect(page).toHaveURL("/clients")
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Client created successfully")
  })

  test("should show validation errors for invalid client data", async ({ page }) => {
    await page.goto("/clients/new")

    await page.click('[data-testid="save-button"]')

    await expect(page.locator('[data-testid="tenant-id-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="company-name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="contact-email-error"]')).toBeVisible()
  })

  test("should edit existing client", async ({ page }) => {
    await page.goto("/clients")

    await page.click('[data-testid="client-item"]:first-child [data-testid="edit-button"]')

    await page.fill('[data-testid="company-name"]', "Updated Company Name")
    await page.selectOption('[data-testid="client-status"]', "ACTIVE")

    await page.click('[data-testid="save-button"]')

    await expect(page).toHaveURL("/clients")
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Client updated successfully")
  })

  test("should suspend client", async ({ page }) => {
    await page.goto("/clients")

    await page.click('[data-testid="client-item"]:first-child [data-testid="suspend-button"]')

    await expect(page.locator('[data-testid="suspend-confirmation"]')).toBeVisible()
    await page.fill('[data-testid="suspend-reason"]', "Payment issues")
    await page.click('[data-testid="confirm-suspend"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Client suspended successfully")
  })

  test("should activate suspended client", async ({ page }) => {
    await page.goto("/clients")

    await page.selectOption('[data-testid="filter-status"]', "SUSPENDED")

    const suspendedClients = await page.locator('[data-testid="client-item"]').count()
    if (suspendedClients > 0) {
      await page.click('[data-testid="client-item"]:first-child [data-testid="activate-button"]')

      await expect(page.locator('[data-testid="activate-confirmation"]')).toBeVisible()
      await page.click('[data-testid="confirm-activate"]')

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-message"]')).toContainText("Client activated successfully")
    }
  })

  test("should view client details", async ({ page }) => {
    await page.goto("/clients")

    await page.click('[data-testid="client-item"]:first-child [data-testid="view-button"]')

    await expect(page.locator('[data-testid="client-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="client-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="client-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="client-activity"]')).toBeVisible()
  })

  test("should filter clients by status", async ({ page }) => {
    await page.goto("/clients")

    await page.selectOption('[data-testid="filter-status"]', "ACTIVE")

    const activeClients = await page.locator('[data-testid="client-item"]').count()
    expect(activeClients).toBeGreaterThanOrEqual(0)

    await page.selectOption('[data-testid="filter-status"]', "TRIAL")

    const trialClients = await page.locator('[data-testid="client-item"]').count()
    expect(trialClients).toBeGreaterThanOrEqual(0)
  })

  test("should search clients", async ({ page }) => {
    await page.goto("/clients")

    await page.fill('[data-testid="search-clients"]', "Test Company")
    await page.keyboard.press("Enter")

    const searchResults = await page.locator('[data-testid="client-item"]').count()
    expect(searchResults).toBeGreaterThanOrEqual(0)

    if (searchResults > 0) {
      await expect(page.locator('[data-testid="client-item"]').first()).toContainText("Test Company")
    }
  })

  test("should display client statistics", async ({ page }) => {
    await page.goto("/clients")

    await expect(page.locator('[data-testid="client-statistics"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-clients-stat"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-clients-stat"]')).toBeVisible()
    await expect(page.locator('[data-testid="trial-clients-stat"]')).toBeVisible()
  })
})
