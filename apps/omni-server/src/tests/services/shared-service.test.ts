import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { sharedService } from "../../services/shared-service.js"
import {
  cleanupTestDatabase,
  setupTestTenant,
  createTestClientUser,
  createTestProduct,
} from "../helpers/test-database.js"
import { clientUserFixtures, productFixtures, categoryFixtures, stockFixtures } from "../fixtures/shared-fixtures.js"

describe("SharedService", () => {
  const testTenantId = "test-tenant-123"

  beforeEach(async () => {
    await cleanupTestDatabase()
    await setupTestTenant(testTenantId)
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  describe("ClientUser Management", () => {
    describe("createClientUser", () => {
      it("should create client user with valid data", async () => {
        const userData = {
          ...clientUserFixtures.validClientUser,
          tenantId: testTenantId,
        }

        const user = await sharedService.createClientUser(userData)

        expect(user).toBeDefined()
        expect(user.tenantId).toBe(testTenantId)
        expect(user.email).toBe(userData.email)
        expect(user.name).toBe(userData.name)
        expect(user.role).toBe(userData.role)
        expect(user.status).toBe(userData.status)
      })

      it("should create client user with default values", async () => {
        const userData = {
          tenantId: testTenantId,
          email: "minimal@testcompany.com",
          name: "Minimal User",
        }

        const user = await sharedService.createClientUser(userData)

        expect(user).toBeDefined()
        expect(user.role).toBe("SALESPERSON")
        expect(user.status).toBe("ACTIVE")
      })

      it("should throw error for duplicate email within same tenant", async () => {
        const userData = {
          ...clientUserFixtures.validClientUser,
          tenantId: testTenantId,
        }

        await sharedService.createClientUser(userData)

        await expect(sharedService.createClientUser(userData)).rejects.toThrow()
      })

      it("should allow same email in different tenants", async () => {
        const otherTenantId = "other-tenant-456"
        await setupTestTenant(otherTenantId)

        const userData1 = {
          ...clientUserFixtures.validClientUser,
          tenantId: testTenantId,
        }

        const userData2 = {
          ...clientUserFixtures.validClientUser,
          tenantId: otherTenantId,
        }

        const user1 = await sharedService.createClientUser(userData1)
        const user2 = await sharedService.createClientUser(userData2)

        expect(user1).toBeDefined()
        expect(user2).toBeDefined()
        expect(user1.tenantId).toBe(testTenantId)
        expect(user2.tenantId).toBe(otherTenantId)
      })
    })

    describe("getClientUsersByTenant", () => {
      it("should return users for specific tenant only", async () => {
        const otherTenantId = "other-tenant-456"
        await setupTestTenant(otherTenantId)

        await createTestClientUser({
          ...clientUserFixtures.validClientUser,
          tenantId: testTenantId,
        })

        await createTestClientUser({
          ...clientUserFixtures.adminClientUser,
          tenantId: testTenantId,
        })

        await createTestClientUser({
          ...clientUserFixtures.validClientUser,
          tenantId: otherTenantId,
          email: "other@othercompany.com",
        })

        const users = await sharedService.getClientUsersByTenant(testTenantId)

        expect(users).toHaveLength(2)
        users.forEach((user) => {
          expect(user.tenantId).toBe(testTenantId)
        })
      })
    })
  })

  describe("Product Management", () => {
    describe("createProduct", () => {
      it("should create product with valid data", async () => {
        const productData = {
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        }

        const product = await sharedService.createProduct(productData)

        expect(product).toBeDefined()
        expect(product.tenantId).toBe(testTenantId)
        expect(product.sku).toBe(productData.sku)
        expect(product.name).toBe(productData.name)
        expect(product.price.toString()).toBe(productData.price)
      })

      it("should throw error for duplicate sku within same tenant", async () => {
        const productData = {
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        }

        await sharedService.createProduct(productData)

        await expect(sharedService.createProduct(productData)).rejects.toThrow()
      })

      it("should allow same sku in different tenants", async () => {
        const otherTenantId = "other-tenant-456"
        await setupTestTenant(otherTenantId)

        const productData1 = {
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        }

        const productData2 = {
          ...productFixtures.validProduct,
          tenantId: otherTenantId,
        }

        const product1 = await sharedService.createProduct(productData1)
        const product2 = await sharedService.createProduct(productData2)

        expect(product1).toBeDefined()
        expect(product2).toBeDefined()
        expect(product1.tenantId).toBe(testTenantId)
        expect(product2.tenantId).toBe(otherTenantId)
      })
    })

    describe("getProductsByTenant", () => {
      it("should return products for specific tenant only", async () => {
        const otherTenantId = "other-tenant-456"
        await setupTestTenant(otherTenantId)

        await createTestProduct({
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        })

        await createTestProduct({
          ...productFixtures.expensiveProduct,
          tenantId: testTenantId,
        })

        await createTestProduct({
          ...productFixtures.validProduct,
          tenantId: otherTenantId,
          sku: "OTHER-001",
        })

        const products = await sharedService.getProductsByTenant(testTenantId)

        expect(products).toHaveLength(2)
        products.forEach((product) => {
          expect(product.tenantId).toBe(testTenantId)
        })
      })

      it("should filter products by status", async () => {
        await createTestProduct({
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        })

        await createTestProduct({
          ...productFixtures.discontinuedProduct,
          tenantId: testTenantId,
        })

        const activeProducts = await sharedService.getProductsByTenant(testTenantId, { status: "ACTIVE" })
        const discontinuedProducts = await sharedService.getProductsByTenant(testTenantId, { status: "DISCONTINUED" })

        expect(activeProducts).toHaveLength(1)
        expect(discontinuedProducts).toHaveLength(1)
        expect(activeProducts[0].status).toBe("ACTIVE")
        expect(discontinuedProducts[0].status).toBe("DISCONTINUED")
      })
    })
  })

  describe("Category Management", () => {
    describe("createCategory", () => {
      it("should create category with valid data", async () => {
        const categoryData = {
          ...categoryFixtures.validCategory,
          tenantId: testTenantId,
        }

        const category = await sharedService.createCategory(categoryData)

        expect(category).toBeDefined()
        expect(category.tenantId).toBe(testTenantId)
        expect(category.name).toBe(categoryData.name)
        expect(category.description).toBe(categoryData.description)
      })

      it("should throw error for duplicate name within same tenant", async () => {
        const categoryData = {
          ...categoryFixtures.validCategory,
          tenantId: testTenantId,
        }

        await sharedService.createCategory(categoryData)

        await expect(sharedService.createCategory(categoryData)).rejects.toThrow()
      })
    })
  })

  describe("Stock Management", () => {
    describe("createStock", () => {
      it("should create stock with valid data", async () => {
        const product = await createTestProduct({
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        })

        const stockData = {
          ...stockFixtures.validStock,
          tenantId: testTenantId,
          productId: product.id,
        }

        const stock = await sharedService.createStock(stockData)

        expect(stock).toBeDefined()
        expect(stock.tenantId).toBe(testTenantId)
        expect(stock.productId).toBe(product.id)
        expect(stock.quantity).toBe(stockData.quantity)
        expect(stock.availableQty).toBe(stockData.availableQty)
      })

      it("should throw error for duplicate product stock within same tenant", async () => {
        const product = await createTestProduct({
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        })

        const stockData = {
          ...stockFixtures.validStock,
          tenantId: testTenantId,
          productId: product.id,
        }

        await sharedService.createStock(stockData)

        await expect(sharedService.createStock(stockData)).rejects.toThrow()
      })
    })

    describe("updateStock", () => {
      it("should update stock quantities correctly", async () => {
        const product = await createTestProduct({
          ...productFixtures.validProduct,
          tenantId: testTenantId,
        })

        const stock = await sharedService.createStock({
          ...stockFixtures.validStock,
          tenantId: testTenantId,
          productId: product.id,
        })

        const updateData = {
          quantity: 200,
          reservedQty: 20,
          availableQty: 180,
        }

        const updatedStock = await sharedService.updateStock(stock.id, updateData)

        expect(updatedStock).toBeDefined()
        expect(updatedStock!.quantity).toBe(updateData.quantity)
        expect(updatedStock!.reservedQty).toBe(updateData.reservedQty)
        expect(updatedStock!.availableQty).toBe(updateData.availableQty)
      })
    })
  })
})
