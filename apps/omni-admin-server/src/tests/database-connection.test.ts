import { configureServer } from "@repo/server-core"
import type { ServerInstance } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Database Connection", () => {
  describe("Positive scenarios", () => {
    let server: ServerInstance

    beforeAll(async () => {
      server = await configureServer({
        name: "DB Connection Test Server",
        version: "1.0.0",
        port: 4110,
        health: {
          customChecks: {
            checkDatabase: async () => ({ status: "healthy", details: { connected: true, latency: 25 } }),
          },
        },
      })

      await server.instance.ready()
    })

    afterAll(async () => {
      await server.stop()
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
      expect(body.data.database.latency).toBe(25)
    })

    it("should handle fast database connections", async () => {
      const fastDbServer = await configureServer({
        name: "Fast DB Server",
        version: "1.0.0",
        port: 4210,
        health: {
          customChecks: {
            checkDatabase: async () => ({ status: "healthy", details: { connected: true, latency: 1 } }),
          },
        },
      })

      await fastDbServer.instance.ready()

      const response = await fastDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.latency).toBe(1)

      await fastDbServer.stop()
    })

    it("should handle acceptable high latency connections", async () => {
      const slowDbServer = await configureServer({
        name: "Slow DB Server",
        version: "1.0.0",
        port: 4310,
        health: {
          customChecks: {
            checkDatabase: async () => ({ connected: true, latency: 200 }),
          },
        },
      })

      await slowDbServer.instance.ready()

      const response = await slowDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.latency).toBe(200)

      await slowDbServer.stop()
    })

    it("should handle multiple concurrent database checks", async () => {
      const requests = Array.from({ length: 10 }, () =>
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
  })

  describe("Negative scenarios", () => {
    let disconnectedDbServer: ServerInstance
    let timeoutDbServer: ServerInstance
    let intermittentDbServer: ServerInstance

    beforeAll(async () => {
      disconnectedDbServer = await configureServer({
        name: "Disconnected DB Server",
        version: "1.0.0",
        port: 4410,
        health: {
          customChecks: {
            checkDatabase: async () => ({ connected: false }),
          },
        },
      })

      timeoutDbServer = await configureServer({
        name: "Timeout DB Server",
        version: "1.0.0",
        port: 4510,
        health: {
          customChecks: {
            checkDatabase: async () => {
              throw new Error("Connection timeout")
            },
          },
        },
      })

      let connectionCount = 0
      intermittentDbServer = await configureServer({
        name: "Intermittent DB Server",
        version: "1.0.0",
        port: 4610,
        health: {
          customChecks: {
            checkDatabase: async () => {
              connectionCount++
              if (connectionCount % 3 === 0) {
                throw new Error("Intermittent connection failure")
              }
              return { connected: true, latency: 50 }
            },
          },
        },
      })

      await disconnectedDbServer.instance.ready()
      await timeoutDbServer.instance.ready()
      await intermittentDbServer.instance.ready()
    })

    afterAll(async () => {
      await disconnectedDbServer.stop()
      await timeoutDbServer.stop()
      await intermittentDbServer.stop()
    })

    it("should handle database disconnection gracefully", async () => {
      const response = await disconnectedDbServer.instance.inject({
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
      const response = await timeoutDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(500)
      expect(response.headers["x-request-id"]).toBeDefined()
    })

    it("should handle intermittent database failures", async () => {
      const requests = Array.from({ length: 6 }, () =>
        intermittentDbServer.instance.inject({
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
      const noDbServer = await configureServer({
        name: "No DB Server",
        version: "1.0.0",
        port: 4710,
        health: null,
      })

      await noDbServer.instance.ready()

      const response = await noDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(404)

      await noDbServer.stop()
    })

    it("should handle database checks with extremely high latency", async () => {
      const verySlowDbServer = await configureServer({
        name: "Very Slow DB Server",
        version: "1.0.0",
        port: 4810,
        health: {
          customChecks: {
            checkDatabase: async () => {
              await new Promise((resolve) => setTimeout(resolve, 1000))
              return { connected: true, latency: 1000 }
            },
          },
        },
      })

      await verySlowDbServer.instance.ready()

      const response = await verySlowDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.latency).toBe(1000)

      await verySlowDbServer.stop()
    })

    it("should handle database checks with corrupted response", async () => {
      const corruptedDbServer = await configureServer({
        name: "Corrupted DB Server",
        version: "1.0.0",
        port: 4910,
        health: {
          customChecks: {
            checkDatabase: async () => {
              return { connected: true } as any
            },
          },
        },
      })

      await corruptedDbServer.instance.ready()

      const response = await corruptedDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.database.connected).toBe(true)

      await corruptedDbServer.stop()
    })

    it("should handle database checks returning invalid data types", async () => {
      const invalidDbServer = await configureServer({
        name: "Invalid DB Server",
        version: "1.0.0",
        port: 5010,
        health: {
          customChecks: {
            checkDatabase: async () => {
              return { connected: "yes", latency: "fast" } as any
            },
          },
        },
      })

      await invalidDbServer.instance.ready()

      const response = await invalidDbServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(500)

      await invalidDbServer.stop()
    })

    it("should handle concurrent database failures", async () => {
      const requests = Array.from({ length: 15 }, () =>
        timeoutDbServer.instance.inject({
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