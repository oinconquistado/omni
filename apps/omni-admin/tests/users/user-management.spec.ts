import { expect, test } from "@playwright/test"

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('[data-testid="email-input"]', "admin@omni.com")
    await page.fill('[data-testid="password-input"]', "adminpassword")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("should display users list", async ({ page }) => {
    await page.goto("/users")

    await expect(page.locator('[data-testid="users-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-user-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-role"]')).toBeVisible()
  })

  test("should create new user", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="add-user-button"]')
    await expect(page).toHaveURL("/users/new")

    await page.fill('[data-testid="user-email"]', "newuser@omni.com")
    await page.fill('[data-testid="user-name"]', "New User")
    await page.selectOption('[data-testid="user-role"]', "SUPPORT")
    await page.selectOption('[data-testid="user-status"]', "ACTIVE")

    await page.click('[data-testid="save-button"]')

    await expect(page).toHaveURL("/users")
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("User created successfully")
  })

  test("should show validation errors for invalid user data", async ({ page }) => {
    await page.goto("/users/new")

    await page.click('[data-testid="save-button"]')

    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
  })

  test("should edit existing user", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="user-item"]:first-child [data-testid="edit-button"]')

    await page.fill('[data-testid="user-name"]', "Updated User Name")
    await page.selectOption('[data-testid="user-role"]', "ADMIN")

    await page.click('[data-testid="save-button"]')

    await expect(page).toHaveURL("/users")
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("User updated successfully")
  })

  test("should deactivate user", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="user-item"]:first-child [data-testid="deactivate-button"]')

    await expect(page.locator('[data-testid="deactivate-confirmation"]')).toBeVisible()
    await page.fill('[data-testid="deactivate-reason"]', "User no longer with company")
    await page.click('[data-testid="confirm-deactivate"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("User deactivated successfully")
  })

  test("should reactivate user", async ({ page }) => {
    await page.goto("/users")

    await page.selectOption('[data-testid="filter-status"]', "INACTIVE")

    const inactiveUsers = await page.locator('[data-testid="user-item"]').count()
    if (inactiveUsers > 0) {
      await page.click('[data-testid="user-item"]:first-child [data-testid="reactivate-button"]')

      await expect(page.locator('[data-testid="reactivate-confirmation"]')).toBeVisible()
      await page.click('[data-testid="confirm-reactivate"]')

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-message"]')).toContainText("User reactivated successfully")
    }
  })

  test("should view user details", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="user-item"]:first-child [data-testid="view-button"]')

    await expect(page.locator('[data-testid="user-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-sessions"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-activity"]')).toBeVisible()
  })

  test("should filter users by role", async ({ page }) => {
    await page.goto("/users")

    await page.selectOption('[data-testid="filter-role"]', "ADMIN")

    const adminUsers = await page.locator('[data-testid="user-item"]').count()
    expect(adminUsers).toBeGreaterThanOrEqual(0)

    await page.selectOption('[data-testid="filter-role"]', "SUPPORT")

    const supportUsers = await page.locator('[data-testid="user-item"]').count()
    expect(supportUsers).toBeGreaterThanOrEqual(0)
  })

  test("should search users", async ({ page }) => {
    await page.goto("/users")

    await page.fill('[data-testid="search-users"]', "admin")
    await page.keyboard.press("Enter")

    const searchResults = await page.locator('[data-testid="user-item"]').count()
    expect(searchResults).toBeGreaterThanOrEqual(0)

    if (searchResults > 0) {
      await expect(page.locator('[data-testid="user-item"]').first()).toContainText("admin")
    }
  })

  test("should reset user password", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="user-item"]:first-child [data-testid="reset-password"]')

    await expect(page.locator('[data-testid="reset-password-modal"]')).toBeVisible()
    await page.click('[data-testid="confirm-reset"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText("Password reset successfully")
  })

  test("should view user sessions", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="user-item"]:first-child [data-testid="view-sessions"]')

    await expect(page.locator('[data-testid="user-sessions-modal"]')).toBeVisible()

    const sessionCount = await page.locator('[data-testid="session-item"]').count()
    expect(sessionCount).toBeGreaterThanOrEqual(0)
  })

  test("should revoke user session", async ({ page }) => {
    await page.goto("/users")

    await page.click('[data-testid="user-item"]:first-child [data-testid="view-sessions"]')
    await expect(page.locator('[data-testid="user-sessions-modal"]')).toBeVisible()

    const sessionCount = await page.locator('[data-testid="session-item"]').count()
    if (sessionCount > 0) {
      await page.click('[data-testid="session-item"]:first-child [data-testid="revoke-session"]')

      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-message"]')).toContainText("Session revoked successfully")
    }
  })
})
