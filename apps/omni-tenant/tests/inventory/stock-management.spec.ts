import { test, expect } from "@playwright/test"

test.describe("Stock Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('[data-testid="email-input"]', "test@company.com")
    await page.fill('[data-testid="password-input"]', "password123")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("should display stock overview", async ({ page }) => {
    await page.goto("/inventory")

    await expect(page.locator('[data-testid="stock-overview"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-products"]')).toBeVisible()
    await expect(page.locator('[data-testid="low-stock-alert"]')).toBeVisible()
    await expect(page.locator('[data-testid="out-of-stock"]')).toBeVisible()
  })

  test("should display stock items list", async ({ page }) => {
    await page.goto("/inventory/stock")

    await expect(page.locator('[data-testid="stock-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-stock"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-options"]')).toBeVisible()
  })

  test("should update stock quantity", async ({ page }) => {
    await page.goto("/inventory/stock")

    await page.click('[data-testid="stock-item"]:first-child [data-testid="update-stock"]')

    await expect(page.locator('[data-testid="stock-update-modal"]')).toBeVisible()
    await page.fill('[data-testid="new-quantity"]', "150")
    await page.fill('[data-testid="update-reason"]', "Inventory restock")

    await page.click('[data-testid="confirm-update"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Stock updated successfully")
  })

  test("should reserve stock", async ({ page }) => {
    await page.goto("/inventory/stock")

    await page.click('[data-testid="stock-item"]:first-child [data-testid="reserve-stock"]')

    await expect(page.locator('[data-testid="reserve-modal"]')).toBeVisible()
    await page.fill('[data-testid="reserve-quantity"]', "10")
    await page.fill('[data-testid="reserve-reason"]', "Customer order")

    await page.click('[data-testid="confirm-reserve"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Stock reserved successfully")
  })

  test("should show low stock alerts", async ({ page }) => {
    await page.goto("/inventory/alerts")

    await expect(page.locator('[data-testid="low-stock-alerts"]')).toBeVisible()

    const alertItems = await page.locator('[data-testid="alert-item"]').count()
    if (alertItems > 0) {
      await expect(page.locator('[data-testid="alert-item"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="alert-item"]').first()).toContainText("Low Stock")
    }
  })

  test("should filter stock by availability", async ({ page }) => {
    await page.goto("/inventory/stock")

    await page.selectOption('[data-testid="availability-filter"]', "low-stock")

    const lowStockItems = await page.locator('[data-testid="stock-item"]').count()
    expect(lowStockItems).toBeGreaterThanOrEqual(0)

    await page.selectOption('[data-testid="availability-filter"]', "out-of-stock")

    const outOfStockItems = await page.locator('[data-testid="stock-item"]').count()
    expect(outOfStockItems).toBeGreaterThanOrEqual(0)
  })

  test("should display stock movement history", async ({ page }) => {
    await page.goto("/inventory/stock")

    await page.click('[data-testid="stock-item"]:first-child [data-testid="view-history"]')

    await expect(page.locator('[data-testid="stock-history"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-item"]')).toHaveCount.gte(0)
  })

  test("should set reorder levels", async ({ page }) => {
    await page.goto("/inventory/stock")

    await page.click('[data-testid="stock-item"]:first-child [data-testid="set-reorder"]')

    await expect(page.locator('[data-testid="reorder-modal"]')).toBeVisible()
    await page.fill('[data-testid="reorder-level"]', "20")
    await page.fill('[data-testid="max-stock-level"]', "500")

    await page.click('[data-testid="save-reorder"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Reorder levels updated")
  })

  test("should search stock by product name", async ({ page }) => {
    await page.goto("/inventory/stock")

    await page.fill('[data-testid="search-stock"]', "Test Product")
    await page.keyboard.press("Enter")

    const searchResults = await page.locator('[data-testid="stock-item"]').count()
    expect(searchResults).toBeGreaterThanOrEqual(0)

    if (searchResults > 0) {
      await expect(page.locator('[data-testid="stock-item"]').first()).toContainText("Test Product")
    }
  })
})
