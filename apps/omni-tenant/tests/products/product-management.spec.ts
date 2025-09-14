import { expect, test } from "@playwright/test"

test.describe("Product Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('[data-testid="email-input"]', "test@company.com")
    await page.fill('[data-testid="password-input"]', "password123")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("should display products list", async ({ page }) => {
    await page.goto("/products")

    await expect(page.locator('[data-testid="products-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-product-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
  })

  test("should create new product", async ({ page }) => {
    await page.goto("/products")

    await page.click('[data-testid="add-product-button"]')
    await expect(page).toHaveURL("/products/new")

    await page.fill('[data-testid="product-sku"]', "TEST-001")
    await page.fill('[data-testid="product-name"]', "Test Product")
    await page.fill('[data-testid="product-description"]', "This is a test product")
    await page.fill('[data-testid="product-price"]', "99.99")
    await page.selectOption('[data-testid="product-status"]', "ACTIVE")

    await page.click('[data-testid="save-button"]')

    await expect(page).toHaveURL("/products")
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Product created successfully")
  })

  test("should show validation errors for invalid product data", async ({ page }) => {
    await page.goto("/products/new")

    await page.click('[data-testid="save-button"]')

    await expect(page.locator('[data-testid="sku-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="price-error"]')).toBeVisible()
  })

  test("should edit existing product", async ({ page }) => {
    await page.goto("/products")

    await page.click('[data-testid="product-item"]:first-child [data-testid="edit-button"]')

    await page.fill('[data-testid="product-name"]', "Updated Product Name")
    await page.fill('[data-testid="product-price"]', "149.99")

    await page.click('[data-testid="save-button"]')

    await expect(page).toHaveURL("/products")
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Product updated successfully")
  })

  test("should delete product", async ({ page }) => {
    await page.goto("/products")

    await page.click('[data-testid="product-item"]:first-child [data-testid="delete-button"]')

    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible()
    await page.click('[data-testid="confirm-delete"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Product deleted successfully")
  })

  test("should filter products by search", async ({ page }) => {
    await page.goto("/products")

    await page.fill('[data-testid="search-input"]', "Test Product")
    await page.keyboard.press("Enter")

    await expect(page.locator('[data-testid="product-item"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="product-item"]')).toContainText("Test Product")
  })

  test("should filter products by status", async ({ page }) => {
    await page.goto("/products")

    await page.selectOption('[data-testid="status-filter"]', "ACTIVE")

    const activeProducts = await page.locator('[data-testid="product-item"]').count()
    expect(activeProducts).toBeGreaterThan(0)

    await page.selectOption('[data-testid="status-filter"]', "INACTIVE")

    const inactiveProducts = await page.locator('[data-testid="product-item"]').count()
    expect(inactiveProducts).toBeGreaterThanOrEqual(0)
  })

  test("should display product details", async ({ page }) => {
    await page.goto("/products")

    await page.click('[data-testid="product-item"]:first-child [data-testid="view-button"]')

    await expect(page.locator('[data-testid="product-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="product-sku"]')).toBeVisible()
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible()
    await expect(page.locator('[data-testid="product-status"]')).toBeVisible()
  })
})
