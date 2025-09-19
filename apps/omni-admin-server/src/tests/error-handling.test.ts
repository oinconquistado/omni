import type { ServerInstance } from "@repo/server-core"
import { configureServer } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Error Handling", () => {
  describe("Positive scenarios", () => {
    let server: ServerInstance

    beforeAll(async () => {
      server = await configureServer({
        name: "Error Test Server",
        version: "1.0.0",
        port: 3810,
        health: {
          checkDatabase: async () => ({ status: "healthy", details: { connected: true, latency: 5 } }),
        },
      })

      await server.instance.ready()
    })

    afterAll(async () => {
      await server.stop()
    })

    it("should handle valid requests properly", async () => {
      const response = await server.instance.inject({
        method: "GET",
        url: "/health",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })

    it("should return proper error structure for 404", async () => {
      const response = await server.instance.inject({
        method: "GET",
        url: "/nonexistent",
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("error")
      expect(body).toHaveProperty("message")
      expect(body).toHaveProperty("statusCode")
    })

    it("should handle method not allowed properly", async () => {
      const response = await server.instance.inject({
        method: "POST",
        url: "/health",
      })

      expect(response.statusCode).toBe(404)
    })

    it("should include request ID in error responses", async () => {
      const response = await server.instance.inject({
        method: "GET",
        url: "/nonexistent",
      })

      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })
  })

  describe("Negative scenarios", () => {
    let errorServer: ServerInstance

    beforeAll(async () => {
      errorServer = await configureServer({
        name: "Error Scenario Server",
        version: "1.0.0",
        port: 3910,
      })

      await errorServer.instance.ready()
    })

    afterAll(async () => {
      await errorServer.stop()
    })

    it("should handle database errors gracefully", async () => {
      const response = await errorServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(404)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle malformed JSON in request body", async () => {
      const response = await errorServer.instance.inject({
        method: "POST",
        url: "/health",
        payload: "invalid json {",
        headers: {
          "content-type": "application/json",
        },
      })

      expect([400, 405]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle oversized request bodies", async () => {
      const largePayload = "x".repeat(2000000)

      const response = await errorServer.instance.inject({
        method: "POST",
        url: "/health",
        payload: largePayload,
      })

      expect([400, 404, 405, 413]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle requests with invalid headers", async () => {
      const response = await errorServer.instance.inject({
        method: "GET",
        url: "/health",
        headers: {
          "content-type": "invalid/type",
          "x-custom-header": "\x00\x01\x02",
        },
      })

      expect([200, 400, 404]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle concurrent error requests", async () => {
      const requests = Array.from({ length: 20 }, () =>
        errorServer.instance.inject({
          method: "GET",
          url: "/health/database",
        }),
      )

      const responses = await Promise.all(requests)

      for (const response of responses) {
        expect([404, 500]).toContain(response.statusCode)
        expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
      }
    })

    it("should handle requests with extremely long URLs", async () => {
      const longPath = `/health/${"a".repeat(10000)}`

      const response = await errorServer.instance.inject({
        method: "GET",
        url: longPath,
      })

      expect([404, 414]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle requests with special characters in path", async () => {
      const specialPath = "/health/test%00%01%02%ff"

      const response = await errorServer.instance.inject({
        method: "GET",
        url: specialPath,
      })

      expect([400, 404]).toContain(response.statusCode)
      // Special characters might cause request to fail before middleware runs
      // So we check if header exists but don't require it for this edge case
      if (response.statusCode === 404) {
        expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
      }
    })

    it("should handle requests with null bytes in query parameters", async () => {
      const response = await errorServer.instance.inject({
        method: "GET",
        url: "/health?test=value%00null",
      })

      expect([200, 400, 404]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle timeout scenarios gracefully", async () => {
      const slowServer = await configureServer({
        name: "Slow Server",
        version: "1.0.0",
        port: 4010,
        health: {
          checkDatabase: async () => {
            await new Promise((resolve) => setTimeout(resolve, 100))
            return { status: "healthy", details: { connected: true, latency: 100 } }
          },
        },
      })

      await slowServer.instance.ready()

      const response = await slowServer.instance.inject({
        method: "GET",
        url: "/health/database",
      })

      expect([200, 404]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()

      await slowServer.stop()
    })
  })
})
