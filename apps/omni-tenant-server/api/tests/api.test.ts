import { createServer, logTestExecution, registerApiRoutes } from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("API Routes", () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3105,
    })

    await registerApiRoutes(server, {
      name: "Test Server",
      version: "1.0.0",
    })

    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it("should return API info on root endpoint", async () => {
    const testName = "should return API info on root endpoint"
    logTestExecution(testName, "api.test.ts", "started")

    try {
      const response = await server.inject({
        method: "GET",
        url: "/",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.message).toBe("Test Server")
      expect(body.data.version).toBe("1.0.0")

      logTestExecution(testName, "api.test.ts", "completed")
    } catch (error) {
      logTestExecution(testName, "api.test.ts", "failed", error as Error)
      throw error
    }
  })
})
