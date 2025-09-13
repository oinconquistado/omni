import type { ClientUserRole, ClientUserStatus, ProductStatus } from "../../generated/shared-client/index.js"

export const clientUserFixtures = {
  validClientUser: {
    tenantId: "tenant-123",
    email: "user@testcompany.com",
    name: "Test Client User",
    role: "SALESPERSON" as ClientUserRole,
    status: "ACTIVE" as ClientUserStatus,
  },

  adminClientUser: {
    tenantId: "tenant-123",
    email: "admin@testcompany.com",
    name: "Admin Client User",
    role: "ADMIN" as ClientUserRole,
    status: "ACTIVE" as ClientUserStatus,
  },

  inactiveClientUser: {
    tenantId: "tenant-123",
    email: "inactive@testcompany.com",
    name: "Inactive Client User",
    role: "SALESPERSON" as ClientUserRole,
    status: "INACTIVE" as ClientUserStatus,
  },
}

export const productFixtures = {
  validProduct: {
    tenantId: "tenant-123",
    sku: "PROD-001",
    name: "Test Product",
    description: "Test product description",
    price: "99.99",
    status: "ACTIVE" as ProductStatus,
  },

  expensiveProduct: {
    tenantId: "tenant-123",
    sku: "PROD-002",
    name: "Expensive Product",
    description: "High-value test product",
    price: "1999.99",
    status: "ACTIVE" as ProductStatus,
  },

  discontinuedProduct: {
    tenantId: "tenant-123",
    sku: "PROD-003",
    name: "Discontinued Product",
    description: "No longer available",
    price: "49.99",
    status: "DISCONTINUED" as ProductStatus,
  },
}

export const categoryFixtures = {
  validCategory: {
    tenantId: "tenant-123",
    name: "Electronics",
    description: "Electronic devices and accessories",
  },

  clothingCategory: {
    tenantId: "tenant-123",
    name: "Clothing",
    description: "Apparel and fashion items",
  },

  booksCategory: {
    tenantId: "tenant-123",
    name: "Books",
    description: "Books and educational materials",
  },
}

export const stockFixtures = {
  validStock: {
    tenantId: "tenant-123",
    quantity: 100,
    reservedQty: 10,
    availableQty: 90,
    reorderLevel: 20,
    maxStockLevel: 500,
  },

  lowStock: {
    tenantId: "tenant-123",
    quantity: 15,
    reservedQty: 5,
    availableQty: 10,
    reorderLevel: 20,
    maxStockLevel: 200,
  },

  outOfStock: {
    tenantId: "tenant-123",
    quantity: 0,
    reservedQty: 0,
    availableQty: 0,
    reorderLevel: 10,
    maxStockLevel: 100,
  },
}
