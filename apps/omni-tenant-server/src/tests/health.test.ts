import { createServer, registerHealthRoutes } from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Health Routes", () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3006,
    })

    await registerHealthRoutes(server, {
      checkDatabase: async () => ({ connected: true, latency: 10 }),
    })

    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it("should return healthy status on /health", async () => {
    const response = await server.inject({
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
    const response = await server.inject({
      method: "GET",
      url: "/health/database",
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data.status).toBe("healthy")
    expect(body.data.database.connected).toBe(true)
    expect(body.data.database.latency).toBe(10)
  })
})
