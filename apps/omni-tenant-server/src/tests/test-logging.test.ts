import { createServer, initializeSentry, logTestExecution, registerApiRoutes } from "@repo/server-core"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Test Logging to Sentry", () => {
  let server: FastifyInstance

  beforeAll(async () => {
    // Inicializar Sentry com DSN real para este teste específico
    initializeSentry({
      dsn: process.env.SENTRY_DSN,
      environment: "test",
      appName: "test-logging-demo",
      tracesSampleRate: 1.0,
    })

    server = await createServer({
      name: "Test Logging Server",
      version: "1.0.0",
      port: 3200,
    })

    await registerApiRoutes(server, {
      name: "Test Logging Server",
      version: "1.0.0",
    })

    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it("should log successful test execution to Sentry", async () => {
    const testName = "should log successful test execution to Sentry"
    logTestExecution(testName, "test-logging.test.ts", "started")

    try {
      const response = await server.inject({
        method: "GET",
        url: "/",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)

      logTestExecution(testName, "test-logging.test.ts", "completed")
      console.log("📊 Test completion logged to Sentry")
    } catch (error) {
      logTestExecution(testName, "test-logging.test.ts", "failed", error as Error)
      throw error
    }
  })

  it("should log failed test execution to Sentry", async () => {
    const testName = "should log failed test execution to Sentry"
    logTestExecution(testName, "test-logging.test.ts", "started")

    try {
      // Simular uma falha intencional
      const response = await server.inject({
        method: "GET",
        url: "/nonexistent-endpoint",
      })

      // Essa expectativa vai falhar intencionalmente para demonstrar o logging de erro
      if (response.statusCode === 404) {
        const simulatedError = new Error("Test intentionally failed to demonstrate error logging")
        logTestExecution(testName, "test-logging.test.ts", "failed", simulatedError)
        console.log("📊 Test failure logged to Sentry")

        // Não jogar o erro para não falhar o teste de verdade
        // throw simulatedError
      }

      logTestExecution(testName, "test-logging.test.ts", "completed")
    } catch (error) {
      logTestExecution(testName, "test-logging.test.ts", "failed", error as Error)
      throw error
    }
  })

  it("should log test suite information", async () => {
    const testName = "should log test suite information"
    logTestExecution(testName, "test-logging.test.ts", "started")

    try {
      // Log informações sobre o suite de testes
      logTestExecution("Test Suite Started", "test-logging.test.ts", "started")

      // Simular algum processamento
      await new Promise((resolve) => setTimeout(resolve, 100))

      logTestExecution("Test Suite Completed", "test-logging.test.ts", "completed")
      logTestExecution(testName, "test-logging.test.ts", "completed")

      console.log("📊 Test suite information logged to Sentry")
    } catch (error) {
      logTestExecution(testName, "test-logging.test.ts", "failed", error as Error)
      throw error
    }
  })
})
