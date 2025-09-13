import type {
  Category,
  ClientSession,
  ClientUser,
  ClientUserRole,
  ClientUserStatus,
  Product,
  ProductStatus,
  Stock,
} from "@omni/shared-client"
import { sharedDb } from "./database-clients.js"

export class SharedService {
  async createClientUser(data: {
    tenantId: string
    email: string
    name: string
    role?: ClientUserRole
    status?: ClientUserStatus
  }): Promise<ClientUser | null> {
    try {
      return await sharedDb.clientUser.create({
        data: {
          tenantId: data.tenantId,
          email: data.email,
          name: data.name,
          role: data.role || "SALESPERSON",
          status: data.status || "ACTIVE",
        },
      })
    } catch (error) {
      console.error("Error creating client user:", error)
      return null
    }
  }

  async getClientUserById(id: string): Promise<ClientUser | null> {
    try {
      return await sharedDb.clientUser.findUnique({
        where: { id },
        include: {
          sessions: {
            where: {
              expiresAt: {
                gte: new Date(),
              },
            },
          },
        },
      })
    } catch (error) {
      console.error("Error fetching client user:", error)
      return null
    }
  }

  async getClientUserByEmail(tenantId: string, email: string): Promise<ClientUser | null> {
    try {
      return await sharedDb.clientUser.findUnique({
        where: {
          unique_email_per_tenant: {
            tenantId,
            email,
          },
        },
        include: {
          sessions: {
            where: {
              expiresAt: {
                gte: new Date(),
              },
            },
          },
        },
      })
    } catch (error) {
      console.error("Error fetching client user by email:", error)
      return null
    }
  }

  async listClientUsers(
    tenantId: string,
    params?: {
      role?: ClientUserRole
      status?: ClientUserStatus
      limit?: number
      offset?: number
    },
  ): Promise<ClientUser[]> {
    try {
      const where: any = { tenantId }

      if (params?.role) where.role = params.role
      if (params?.status) where.status = params.status

      return await sharedDb.clientUser.findMany({
        where,
        take: params?.limit,
        skip: params?.offset,
        orderBy: {
          createdAt: "desc",
        },
      })
    } catch (error) {
      console.error("Error listing client users:", error)
      return []
    }
  }

  async createClientSession(data: {
    tenantId: string
    clientUserId: string
    token: string
    expiresAt: Date
  }): Promise<ClientSession | null> {
    try {
      return await sharedDb.clientSession.create({
        data,
        include: {
          clientUser: true,
        },
      })
    } catch (error) {
      console.error("Error creating client session:", error)
      return null
    }
  }

  async getClientSessionByToken(token: string): Promise<ClientSession | null> {
    try {
      const session = await sharedDb.clientSession.findUnique({
        where: { token },
        include: {
          clientUser: true,
        },
      })

      // Check if session is expired
      if (session && session.expiresAt < new Date()) {
        await this.deleteClientSession(session.id)
        return null
      }

      return session
    } catch (error) {
      console.error("Error fetching client session:", error)
      return null
    }
  }

  async deleteClientSession(id: string): Promise<boolean> {
    try {
      await sharedDb.clientSession.delete({
        where: { id },
      })
      return true
    } catch (error) {
      console.error("Error deleting client session:", error)
      return false
    }
  }

  async createProduct(data: {
    tenantId: string
    sku: string
    name: string
    description?: string
    price: number
    status?: ProductStatus
  }): Promise<Product | null> {
    try {
      return await sharedDb.product.create({
        data: {
          tenantId: data.tenantId,
          sku: data.sku,
          name: data.name,
          description: data.description,
          price: data.price,
          status: data.status || "ACTIVE",
        },
      })
    } catch (error) {
      console.error("Error creating product:", error)
      return null
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      return await sharedDb.product.findUnique({
        where: { id },
      })
    } catch (error) {
      console.error("Error fetching product:", error)
      return null
    }
  }

  async getProductBySku(tenantId: string, sku: string): Promise<Product | null> {
    try {
      return await sharedDb.product.findUnique({
        where: {
          unique_sku_per_tenant: {
            tenantId,
            sku,
          },
        },
      })
    } catch (error) {
      console.error("Error fetching product by SKU:", error)
      return null
    }
  }

  async listProducts(
    tenantId: string,
    params?: {
      status?: ProductStatus
      limit?: number
      offset?: number
    },
  ): Promise<Product[]> {
    try {
      const where: any = { tenantId }

      if (params?.status) where.status = params.status

      return await sharedDb.product.findMany({
        where,
        take: params?.limit,
        skip: params?.offset,
        orderBy: {
          createdAt: "desc",
        },
      })
    } catch (error) {
      console.error("Error listing products:", error)
      return []
    }
  }

  async createCategory(data: { tenantId: string; name: string; description?: string }): Promise<Category | null> {
    try {
      return await sharedDb.category.create({
        data: {
          tenantId: data.tenantId,
          name: data.name,
          description: data.description,
        },
      })
    } catch (error) {
      console.error("Error creating category:", error)
      return null
    }
  }

  async listCategories(tenantId: string): Promise<Category[]> {
    try {
      return await sharedDb.category.findMany({
        where: { tenantId },
        orderBy: {
          name: "asc",
        },
      })
    } catch (error) {
      console.error("Error listing categories:", error)
      return []
    }
  }

  async createStock(data: {
    tenantId: string
    productId: string
    quantity?: number
    reorderLevel?: number
    maxStockLevel?: number
  }): Promise<Stock | null> {
    try {
      return await sharedDb.stock.create({
        data: {
          tenantId: data.tenantId,
          productId: data.productId,
          quantity: data.quantity || 0,
          availableQty: data.quantity || 0,
          reorderLevel: data.reorderLevel,
          maxStockLevel: data.maxStockLevel,
        },
      })
    } catch (error) {
      console.error("Error creating stock:", error)
      return null
    }
  }

  async getStockByProduct(tenantId: string, productId: string): Promise<Stock | null> {
    try {
      return await sharedDb.stock.findUnique({
        where: {
          unique_stock_per_product: {
            tenantId,
            productId,
          },
        },
      })
    } catch (error) {
      console.error("Error fetching stock:", error)
      return null
    }
  }

  async updateStock(
    tenantId: string,
    productId: string,
    data: {
      quantity?: number
      reservedQty?: number
      reorderLevel?: number
      maxStockLevel?: number
    },
  ): Promise<Stock | null> {
    try {
      const updateData: any = { ...data, lastUpdated: new Date() }

      // Calculate available quantity if quantity or reserved quantity changed
      if (data.quantity !== undefined || data.reservedQty !== undefined) {
        const currentStock = await this.getStockByProduct(tenantId, productId)
        if (currentStock) {
          const newQuantity = data.quantity ?? currentStock.quantity
          const newReserved = data.reservedQty ?? currentStock.reservedQty
          updateData.availableQty = newQuantity - newReserved
        }
      }

      return await sharedDb.stock.update({
        where: {
          unique_stock_per_product: {
            tenantId,
            productId,
          },
        },
        data: updateData,
      })
    } catch (error) {
      console.error("Error updating stock:", error)
      return null
    }
  }
}

export const sharedService = new SharedService()
