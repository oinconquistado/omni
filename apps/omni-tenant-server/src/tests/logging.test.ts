import { createServer } from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const REQUEST_ID_REGEX = /^[a-z0-9]+$/

describe("Logging", () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3008,
      logger: {
        level: "info",
        pretty: false,
      },
    })

    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it("should have logger configured", () => {
    expect(server.log).toBeDefined()
    expect(server.log.info).toBeTypeOf("function")
    expect(server.log.error).toBeTypeOf("function")
    expect(server.log.warn).toBeTypeOf("function")
  })

  it("should generate request ID for logging", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    })

    expect(response.headers["x-request-id"]).toBeDefined()
    expect(response.headers["x-request-id"]).toMatch(REQUEST_ID_REGEX)
  })

  it("should log request and response", async () => {
    const logSpy = vi.fn()
    server.log.info = logSpy

    await server.inject({
      method: "GET",
      url: "/health",
    })

    expect(logSpy).toHaveBeenCalled()
  })
})
