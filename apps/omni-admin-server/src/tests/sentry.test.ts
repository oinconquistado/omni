import {
  configureServer,
  isSentryInitialized,
} from "@repo/server-core"
import type { ServerInstance } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Sentry Integration", () => {
  let server: ServerInstance

  beforeAll(async () => {
    server = await configureServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3009,
      sentry: {
        dsn: undefined,
        environment: "test",
        appName: "test-server",
      },
    })

    await server.instance.ready()
  })

  afterAll(async () => {
    await server.stop()
  })

  it("should handle missing Sentry DSN gracefully", () => {
    expect(isSentryInitialized()).toBe(false)
  })

  it("should register Sentry error handler without DSN", async () => {
    expect(() => registerSentryErrorHandler(server)).not.toThrow()
  })

  it("should not register debug route in production", async () => {
    const prodServer = await createServer({
      name: "Prod Test Server",
      version: "1.0.0",
      port: 3010,
    })

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"

    await registerSentryDebugRoute(prodServer)

    const response = await prodServer.inject({
      method: "GET",
      url: "/debug-sentry",
    })

    expect(response.statusCode).toBe(404)

    process.env.NODE_ENV = originalEnv
    await prodServer.close()
  })

  it("should register debug route in development", async () => {
    const routes = server.printRoutes()
    expect(routes.includes("/debug-sentry") || routes.includes("debug-sentry")).toBe(true)
  })
})
