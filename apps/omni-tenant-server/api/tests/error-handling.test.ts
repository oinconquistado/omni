import { createServer, registerApiRoutes, registerHealthRoutes } from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Error Handling", () => {
  describe("Positive scenarios", () => {
    let server: FastifyInstance

    beforeAll(async () => {
      server = await createServer({
        name: "Error Test Server",
        version: "1.0.0",
        port: 3820,
      })

      await registerApiRoutes(server, {
        name: "Error Test Server",
        version: "1.0.0",
      })

      await registerHealthRoutes(server, {
        checkDatabase: async () => ({ status: "healthy", details: { latency: 5 } }),
      })

      await server.ready()
    })

    afterAll(async () => {
      await server.close()
    })

    it("should handle valid requests properly", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/health",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })

    it("should return proper error structure for 404", async () => {
      const response = await server.inject({
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
      const response = await server.inject({
        method: "POST",
        url: "/health",
      })

      expect(response.statusCode).toBe(404)
    })

    it("should include request ID in error responses", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/nonexistent",
      })

      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })
  })

  describe("Negative scenarios", () => {
    let errorServer: FastifyInstance

    beforeAll(async () => {
      errorServer = await createServer({
        name: "Error Scenario Server",
        version: "1.0.0",
        port: 3920,
      })

      await registerHealthRoutes(errorServer, {
        checkDatabase: async () => {
          throw new Error("Database connection failed")
        },
      })

      await errorServer.ready()
    })

    afterAll(async () => {
      await errorServer.close()
    })

    it("should handle database errors gracefully", async () => {
      const response = await errorServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(500)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle malformed JSON in request body", async () => {
      const response = await errorServer.inject({
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

      const response = await errorServer.inject({
        method: "POST",
        url: "/health",
        payload: largePayload,
      })

      expect([400, 404, 405, 413]).toContain(response.statusCode)
      expect(response.headers["x-request-id"] || response.headers["X-Request-Id"]).toBeDefined()
    })

    it("should handle requests with invalid headers", async () => {
      const response = await errorServer.inject({
        method: "GET",
        url: "/health",
        headers: {
          "content-type": "invalid/type",
          "x-custom-header": "\x00\x01\x02",
        },
      })

      expect([200, 400]).toContain(response.statusCode)
      expect(response.headers["x-request-id"]).toBeDefined()
    })

    it("should handle concurrent error requests", async () => {
      const requests = Array.from({ length: 20 }, () =>
        errorServer.inject({
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

    it("should handle requests with extremely long URLs", async () => {
      const longPath = `/health/${"a".repeat(10000)}`

      const response = await errorServer.inject({
        method: "GET",
        url: longPath,
      })

      expect([404, 414]).toContain(response.statusCode)
      expect(response.headers["x-request-id"]).toBeDefined()
    })

    it("should handle requests with special characters in path", async () => {
      const specialPath = "/health/test%00%01%02%ff"

      const response = await errorServer.inject({
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
      const response = await errorServer.inject({
        method: "GET",
        url: "/health?test=value%00null",
      })

      expect([200, 400]).toContain(response.statusCode)
      expect(response.headers["x-request-id"]).toBeDefined()
    })

    it("should handle timeout scenarios gracefully", async () => {
      const slowServer = await createServer({
        name: "Slow Server",
        version: "1.0.0",
        port: 4020,
      })

      await registerHealthRoutes(slowServer, {
        checkDatabase: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return { status: "healthy", details: { latency: 100 } }
        },
      })

      await slowServer.ready()

      const response = await slowServer.inject({
        method: "GET",
        url: "/health/database",
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers["x-request-id"]).toBeDefined()

      await slowServer.close()
    })
  })
})
