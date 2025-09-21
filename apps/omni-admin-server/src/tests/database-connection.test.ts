import { PrismaClient } from "@omni/admin-client"
import type { ServerInstance } from "@repo/server-core"
import { checkDatabaseHealth, configureServer } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Database Connection", () => {
  describe("Real database connection", () => {
    let server: ServerInstance
    let prisma: PrismaClient

    beforeAll(async () => {
      prisma = new PrismaClient()

      server = await configureServer({
        name: "DB Connection Test Server",
        version: "1.0.0",
        port: 4110,
        database: { client: prisma },
        health: {
          checkDatabase: async () => {
            const result = await checkDatabaseHealth(prisma)
            return {
              status: result.connected ? "healthy" : "unhealthy",
              details: { latency: result.latency },
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

    it("should successfully connect to database", async () => {
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

    it("should handle multiple concurrent database checks", async () => {
      const requests = Array.from({ length: 5 }, () =>
        server.instance.inject({
          method: "GET",
          url: "/health/database",
        }),
      )

      const responses = await Promise.all(requests)

      for (const response of responses) {
        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.success).toBe(true)
        expect(body.data.database.connected).toBe(true)
      }
    })

    it("should handle database connection with no health check configured", async () => {
      const noDbServer = await configureServer({
        name: "No DB Server",
        version: "1.0.0",
        port: 4710,
        health: { enabled: false },
      })

      await noDbServer.instance.ready()

      const response = await noDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(404)

      await noDbServer.stop()
    })
  })
})
