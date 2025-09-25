import {
  createServer,
  initializeSentry,
  isSentryInitialized,
  logTestExecution,
  registerSentryDebugRoute,
  registerSentryErrorHandler,
} from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Sentry Integration", () => {
  // Mock logger for tests
  const mockLogger = {
    debug: () => {
      /* empty */
    },
    info: () => {
      /* empty */
    },
    warn: () => {
      /* empty */
    },
    error: () => {
      /* empty */
    },
  }

  describe("Positive scenarios", () => {
    let server: FastifyInstance

    beforeAll(async () => {
      initializeSentry(
        {
          dsn: undefined,
          environment: "test",
          appName: "test-server",
        },
        mockLogger as any,
      )

      server = await createServer({
        name: "Test Server",
        version: "1.0.0",
        port: 3119,
      })

      await registerSentryErrorHandler(server)
      await registerSentryDebugRoute(server)
      await server.ready()
    })

    afterAll(async () => {
      await server.close()
    })

    it("should handle missing Sentry DSN gracefully", () => {
      // Without Sentry config, Sentry should not be initialized automatically
      expect(isSentryInitialized()).toBe(false)
    })

    it("should register Sentry error handler without DSN", async () => {
      expect(() => registerSentryErrorHandler(server)).not.toThrow()
    })

    it("should register debug route in development", async () => {
      const routes = server.printRoutes()
      expect(routes.includes("/debug-sentry") || routes.includes("debug-sentry")).toBe(true)
    })

    it("should have Sentry configuration functions available", () => {
      expect(typeof initializeSentry).toBe("function")
      expect(typeof isSentryInitialized).toBe("function")
      expect(typeof registerSentryErrorHandler).toBe("function")
      expect(typeof registerSentryDebugRoute).toBe("function")
    })

    it("should allow multiple Sentry handler registrations", async () => {
      expect(() => registerSentryErrorHandler(server)).not.toThrow()
      expect(() => registerSentryErrorHandler(server)).not.toThrow()
    })

    it("should handle Sentry initialization with valid configuration", () => {
      expect(() =>
        initializeSentry(
          {
            dsn: "https://example@sentry.io/123456",
            environment: "test",
            appName: "test-app",
          },
          mockLogger as any,
        ),
      ).not.toThrow()
    })
  })

  describe("Negative scenarios", () => {
    let prodServer: FastifyInstance
    let errorServer: FastifyInstance

    beforeAll(async () => {
      prodServer = await createServer({
        name: "Prod Test Server",
        version: "1.0.0",
        port: 3120,
      })

      errorServer = await createServer({
        name: "Error Test Server",
        version: "1.0.0",
        port: 3809,
      })

      await registerSentryErrorHandler(errorServer)
      await registerSentryDebugRoute(errorServer)

      await prodServer.ready()
      await errorServer.ready()
    })

    afterAll(async () => {
      await prodServer.close()
      await errorServer.close()
    })

    it("should not register debug route in production", async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = "production"

      await registerSentryDebugRoute(prodServer)

      const response = await prodServer.inject({
        method: "GET",
        url: "/debug-sentry",
      })

      expect(response.statusCode).toBe(404)

      process.env.NODE_ENV = originalEnv
    })

    it("should handle invalid Sentry DSN gracefully", () => {
      expect(() =>
        initializeSentry(
          {
            dsn: "invalid-dsn",
            environment: "test",
            appName: "test-app",
          },
          mockLogger as any,
        ),
      ).not.toThrow()
    })

    it("should handle empty Sentry configuration", () => {
      expect(() =>
        initializeSentry(
          {
            dsn: "",
            environment: "",
            appName: "",
          },
          mockLogger as any,
        ),
      ).not.toThrow()
    })

    it("should handle null/undefined Sentry configuration", () => {
      expect(() =>
        initializeSentry(
          {
            dsn: null as unknown as string,
            environment: undefined as unknown as string,
            appName: null as unknown as string,
          },
          mockLogger as any,
        ),
      ).not.toThrow()
    })

    it("should handle Sentry debug route with POST method", async () => {
      const response = await errorServer.inject({
        method: "POST",
        url: "/debug-sentry",
      })

      expect(response.statusCode).toBe(404)
    })

    it("should handle Sentry debug route with invalid parameters", async () => {
      const testName = "should handle Sentry debug route with invalid parameters"
      logTestExecution(testName, "sentry.test.ts", "started")

      try {
        const response = await errorServer.inject({
          method: "GET",
          url: "/debug-sentry?invalid=true&malformed",
        })

        expect([200, 400, 500]).toContain(response.statusCode)
        logTestExecution(testName, "sentry.test.ts", "completed")
      } catch (error) {
        logTestExecution(testName, "sentry.test.ts", "failed", error as Error)
        throw error
      }
    })

    it("should handle server errors without crashing", async () => {
      const response = await errorServer.inject({
        method: "GET",
        url: "/nonexistent-route",
      })

      expect(response.statusCode).toBe(404)
    })

    it("should handle concurrent error scenarios", async () => {
      const requests = Array.from({ length: 10 }, () =>
        errorServer.inject({
          method: "GET",
          url: "/nonexistent",
        }),
      )

      const responses = await Promise.all(requests)

      for (const response of responses) {
        expect(response.statusCode).toBe(404)
      }
    })

    it("should handle Sentry initialization multiple times", () => {
      expect(() =>
        initializeSentry(
          {
            dsn: undefined,
            environment: "test",
            appName: "test-app",
          },
          mockLogger as any,
        ),
      ).not.toThrow()

      expect(() =>
        initializeSentry(
          {
            dsn: undefined,
            environment: "test2",
            appName: "test-app2",
          },
          mockLogger as any,
        ),
      ).not.toThrow()
    })
  })
})
