import { PrismaClient } from "@omni/admin-client"
import type { ServerInstance } from "@repo/server-core"
import { checkDatabaseHealth, configureServer } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Health Routes", () => {
  let server: ServerInstance
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()

    server = await configureServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3005,
      database: { client: prisma },
      health: {
        checkDatabase: async () => {
          // Create a simple mock logger for the test
          const mockLogger = {
            debug: () => {
              /* empty */
            },
            info: () => {
              /* empty */
            },
            warn: () => {
              /* empty */
            },
            error: () => {
              /* empty */
            },
          }
          const result = await checkDatabaseHealth(prisma, mockLogger as any)
          return {
            status: result.connected ? "healthy" : "unhealthy",
            details: result as unknown as Record<string, unknown>,
          }
        },
      },
    })

    await server.instance.ready()
  })

  afterAll(async () => {
    await server.stop()
    await prisma.$disconnect()
  })

  it("should return healthy status on /health", async () => {
    const response = await server.instance.inject({
      method: "GET",
      url: "/health",
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data.status).toBe("healthy")
    expect(body.data.timestamp).toBeTypeOf("number")
  })

  it("should return database health status on /health/database", async () => {
    const response = await server.instance.inject({
      method: "GET",
      url: "/health/database",
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data.status).toBe("healthy")
    expect(body.data.database.connected).toBe(true)
    expect(typeof body.data.database.latency).toBe("number")
    expect(body.data.database.latency).toBeGreaterThan(0)
  })
})
