import { PrismaClient } from "@prisma/client"
import { env } from "../config/env.js"

class PrismaService {
  private static instance: PrismaService
  private client: PrismaClient

  private constructor() {
    this.client = new PrismaClient({
      log: env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
      errorFormat: "pretty",
    })

    // Setup connection monitoring
    this.client.$connect().catch((error: unknown) => {
      console.error("Failed to connect to database:", error)
    })

    this.setupShutdownHooks()
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService()
    }
    return PrismaService.instance
  }

  public getClient(): PrismaClient {
    return this.client
  }

  public async connect(): Promise<void> {
    try {
      await this.client.$connect()
      console.log("Prisma connected successfully")
    } catch (error) {
      console.error("Failed to connect to database:", error)
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect()
      console.log("Prisma disconnected successfully")
    } catch (error) {
      console.error("Error disconnecting from database:", error)
      throw error
    }
  }

  private setupShutdownHooks(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`)
      await this.disconnect()
      process.exit(0)
    }

    process.on("SIGINT", () => gracefulShutdown("SIGINT"))
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
  }
}

export const prismaService = PrismaService.getInstance()
export const prisma = prismaService.getClient()
