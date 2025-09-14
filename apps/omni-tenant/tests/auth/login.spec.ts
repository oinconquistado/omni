import { expect, test } from "@playwright/test"

test.describe("User Authentication", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login")

    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test("should show validation errors for empty fields", async ({ page }) => {
    await page.goto("/login")

    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill('[data-testid="email-input"]', "invalid@example.com")
    await page.fill('[data-testid="password-input"]', "wrongpassword")
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="login-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-error"]')).toContainText("Invalid credentials")
  })

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill('[data-testid="email-input"]', "test@company.com")
    await page.fill('[data-testid="password-input"]', "password123")
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test("should logout successfully", async ({ page }) => {
    await page.goto("/login")

    await page.fill('[data-testid="email-input"]', "test@company.com")
    await page.fill('[data-testid="password-input"]', "password123")
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL("/dashboard")

    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    await expect(page).toHaveURL("/login")
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test("should redirect to login when accessing protected route", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page).toHaveURL("/login")
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })
})
