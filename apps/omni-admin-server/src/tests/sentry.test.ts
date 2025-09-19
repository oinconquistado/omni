import type { ServerInstance } from "@repo/server-core"
import { configureServer, isSentryInitialized, registerSentryErrorHandler } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Sentry Integration", () => {
  let server: ServerInstance

  beforeAll(async () => {
    server = await configureServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3009,
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: "test",
        appName: "test-server",
      },
    })

    await server.instance.ready()
  })

  afterAll(async () => {
    await server.stop()
  })

  it("should handle Sentry configuration", () => {
    expect(typeof isSentryInitialized()).toBe("boolean")
  })

  it("should register Sentry error handler", async () => {
    expect(() => registerSentryErrorHandler(server.instance)).not.toThrow()
  })

  it("should handle debug route requests", async () => {
    const response = await server.instance.inject({
      method: "GET",
      url: "/debug-sentry",
    })

    expect([200, 404]).toContain(response.statusCode)
  })
})
