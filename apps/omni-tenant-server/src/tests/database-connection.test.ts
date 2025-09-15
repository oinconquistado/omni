import { createServer, registerHealthRoutes } from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Database Connection", () => {
  describe("Positive scenarios", () => {
    let server: FastifyInstance

    beforeAll(async () => {
      server = await createServer({
        name: "DB Connection Test Server",
        version: "1.0.0",
        port: 4120,
      })

      await registerHealthRoutes(server, {
        checkDatabase: async () => ({ connected: true, latency: 25 }),
      })

      await server.ready()
    })

    afterAll(async () => {
      await server.close()
    })

    it("should successfully connect to database", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe("healthy")
      expect(body.data.database.connected).toBe(true)
      expect(body.data.database.latency).toBe(25)
    })

    it("should handle fast database connections", async () => {
      const fastDbServer = await createServer({
        name: "Fast DB Server",
        version: "1.0.0",
        port: 4220,
      })

      await registerHealthRoutes(fastDbServer, {
        checkDatabase: async () => ({ connected: true, latency: 1 }),
      })

      await fastDbServer.ready()

      const response = await fastDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.latency).toBe(1)

      await fastDbServer.close()
    })

    it("should handle acceptable high latency connections", async () => {
      const slowDbServer = await createServer({
        name: "Slow DB Server",
        version: "1.0.0",
        port: 4320,
      })

      await registerHealthRoutes(slowDbServer, {
        checkDatabase: async () => ({ connected: true, latency: 200 }),
      })

      await slowDbServer.ready()

      const response = await slowDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.latency).toBe(200)

      await slowDbServer.close()
    })

    it("should handle multiple concurrent database checks", async () => {
      const requests = Array.from({ length: 10 }, () =>
        server.inject({
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
  })

  describe("Negative scenarios", () => {
    let disconnectedDbServer: FastifyInstance
    let timeoutDbServer: FastifyInstance
    let intermittentDbServer: FastifyInstance

    beforeAll(async () => {
      disconnectedDbServer = await createServer({
        name: "Disconnected DB Server",
        version: "1.0.0",
        port: 4420,
      })

      timeoutDbServer = await createServer({
        name: "Timeout DB Server",
        version: "1.0.0",
        port: 4520,
      })

      intermittentDbServer = await createServer({
        name: "Intermittent DB Server",
        version: "1.0.0",
        port: 4620,
      })

      await registerHealthRoutes(disconnectedDbServer, {
        checkDatabase: async () => ({ connected: false }),
      })

      await registerHealthRoutes(timeoutDbServer, {
        checkDatabase: async () => {
          throw new Error("Connection timeout")
        },
      })

      let connectionCount = 0
      await registerHealthRoutes(intermittentDbServer, {
        checkDatabase: async () => {
          connectionCount++
          if (connectionCount % 3 === 0) {
            throw new Error("Intermittent connection failure")
          }
          return { connected: true, latency: 50 }
        },
      })

      await disconnectedDbServer.ready()
      await timeoutDbServer.ready()
      await intermittentDbServer.ready()
    })

    afterAll(async () => {
      await disconnectedDbServer.close()
      await timeoutDbServer.close()
      await intermittentDbServer.close()
    })

    it("should handle database disconnection gracefully", async () => {
      const response = await disconnectedDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe("unhealthy")
      expect(body.data.database.connected).toBe(false)
      expect(body.data.database.latency).toBeUndefined()
    })

    it("should handle database timeout errors", async () => {
      const response = await timeoutDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(500)
      expect(response.headers["x-request-id"]).toBeDefined()
    })

    it("should handle intermittent database failures", async () => {
      const requests = Array.from({ length: 6 }, () =>
        intermittentDbServer.inject({
          method: "GET",
          url: "/health/database",
        }),
      )

      const responses = await Promise.all(requests)

      let successCount = 0
      let errorCount = 0

      for (const response of responses) {
        if (response.statusCode === 200) {
          successCount++
          const body = JSON.parse(response.body)
          expect(body.success).toBe(true)
        } else if (response.statusCode === 500) {
          errorCount++
        }
        expect(response.headers["x-request-id"]).toBeDefined()
      }

      expect(successCount).toBeGreaterThan(0)
      expect(errorCount).toBeGreaterThan(0)
    })

    it("should handle database connection with no health check configured", async () => {
      const noDbServer = await createServer({
        name: "No DB Server",
        version: "1.0.0",
        port: 4720,
      })

      await registerHealthRoutes(noDbServer)
      await noDbServer.ready()

      const response = await noDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(404)
      // When no database health check is configured, the route doesn't exist

      await noDbServer.close()
    })

    it("should handle database checks with extremely high latency", async () => {
      const verySlowDbServer = await createServer({
        name: "Very Slow DB Server",
        version: "1.0.0",
        port: 4820,
      })

      await registerHealthRoutes(verySlowDbServer, {
        checkDatabase: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return { connected: true, latency: 1000 }
        },
      })

      await verySlowDbServer.ready()

      const response = await verySlowDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.latency).toBe(1000)

      await verySlowDbServer.close()
    })

    it("should handle database checks with corrupted response", async () => {
      const corruptedDbServer = await createServer({
        name: "Corrupted DB Server",
        version: "1.0.0",
        port: 4920,
      })

      await registerHealthRoutes(corruptedDbServer, {
        checkDatabase: async () => {
          return { connected: true } as any
        },
      })

      await corruptedDbServer.ready()

      const response = await corruptedDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.connected).toBe(true)

      await corruptedDbServer.close()
    })

    it("should handle database checks returning invalid data types", async () => {
      const invalidDbServer = await createServer({
        name: "Invalid DB Server",
        version: "1.0.0",
        port: 5020,
      })

      await registerHealthRoutes(invalidDbServer, {
        checkDatabase: async () => {
          return { connected: "yes", latency: "fast" } as any
        },
      })

      await invalidDbServer.ready()

      const response = await invalidDbServer.inject({
        method: "GET",
        url: "/health/database",
      })

      // Invalid data types should cause an error
      expect(response.statusCode).toBe(500)

      await invalidDbServer.close()
    })

    it("should handle concurrent database failures", async () => {
      const requests = Array.from({ length: 15 }, () =>
        timeoutDbServer.inject({
          method: "GET",
          url: "/health/database",
        }),
      )

      const responses = await Promise.all(requests)

      for (const response of responses) {
        expect(response.statusCode).toBe(500)
        expect(response.headers["x-request-id"]).toBeDefined()
      }
    })
  })
})
