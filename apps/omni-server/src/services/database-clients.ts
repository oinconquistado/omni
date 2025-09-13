import { PrismaClient as CompanyClient } from "@omni/company-client"
import { PrismaClient as SharedClient } from "@omni/shared-client"

const companyDb = new CompanyClient({
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
})

const sharedDb = new SharedClient({
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
})
export class DatabaseManager {
  private static instance: DatabaseManager
  private isConnected = false

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    try {
      await companyDb.$connect()
      console.log("✅ Connected to Company Database")

      await sharedDb.$connect()
      console.log("✅ Connected to Shared Database")

      this.isConnected = true
    } catch (error) {
      console.error("❌ Failed to connect to databases:", error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await companyDb.$disconnect()
      await sharedDb.$disconnect()
      this.isConnected = false
      console.log("✅ Disconnected from databases")
    } catch (error) {
      console.error("❌ Error disconnecting from databases:", error)
      throw error
    }
  }

  async healthCheck(): Promise<{
    company: boolean
    shared: boolean
    timestamp: number
  }> {
    const timestamp = Date.now()

    try {
      await companyDb.$queryRaw`SELECT 1`
      const companyHealthy = true

      await sharedDb.$queryRaw`SELECT 1`
      const sharedHealthy = true

      return {
        company: companyHealthy,
        shared: sharedHealthy,
        timestamp,
      }
    } catch (error) {
      console.error("Database health check failed:", error)
      return {
        company: false,
        shared: false,
        timestamp,
      }
    }
  }

  getCompanyClient(): typeof companyDb {
    return companyDb
  }

  getSharedClient(): typeof sharedDb {
    return sharedDb
  }
}

export const dbManager = DatabaseManager.getInstance()
export { companyDb, sharedDb }
