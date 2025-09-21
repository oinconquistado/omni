import { beforeEach, describe, expect, it } from "vitest"
import { createFastifyLogger, createLogger } from "../logger/logger-config"

describe("Logger Config", () => {
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
  })

  describe("createLogger", () => {
    it("should create a logger with default config", () => {
      const logger = createLogger()

      expect(logger).toBeDefined()
      expect(logger.level).toBe("info")
    })

    it("should create a logger with custom level", () => {
      const logger = createLogger({ level: "debug" })

      expect(logger.level).toBe("debug")
    })

    it("should create a logger with custom app name", () => {
      const logger = createLogger({ appName: "test-app" })

      expect(logger).toBeDefined()
      // Note: pino doesn't expose name directly, but it's used internally
    })

    it("should handle production environment", () => {
      process.env.NODE_ENV = "production"

      const logger = createLogger()

      expect(logger).toBeDefined()

      process.env.NODE_ENV = originalNodeEnv
    })

    it("should handle development environment with pretty printing", () => {
      process.env.NODE_ENV = "development"

      const logger = createLogger({ pretty: true })

      expect(logger).toBeDefined()

      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe("createFastifyLogger", () => {
    it("should create fastify logger config with default values", () => {
      const loggerConfig = createFastifyLogger()

      expect(loggerConfig).toBeDefined()
      expect(loggerConfig.level).toBe("info")
      expect(loggerConfig.name).toBe("server")
      expect(loggerConfig.timestamp).toBeDefined()
      expect(loggerConfig.formatters).toBeDefined()
    })

    it("should create fastify logger config with custom level", () => {
      const loggerConfig = createFastifyLogger({ level: "warn" })

      expect(loggerConfig.level).toBe("warn")
    })

    it("should create fastify logger config with custom app name", () => {
      const loggerConfig = createFastifyLogger({ appName: "custom-app" })

      expect(loggerConfig.name).toBe("custom-app")
    })

    it("should include transport config for pretty printing in development", () => {
      process.env.NODE_ENV = "development"

      const loggerConfig = createFastifyLogger({ pretty: true })

      expect(loggerConfig).toHaveProperty("transport")
      if ("transport" in loggerConfig) {
        expect(loggerConfig.transport.target).toBe("pino-pretty")
        expect(loggerConfig.transport.options).toBeDefined()
        expect(loggerConfig.transport.options.colorize).toBe(true)
      }

      process.env.NODE_ENV = originalNodeEnv
    })

    it("should not include transport config for production", () => {
      process.env.NODE_ENV = "production"

      const loggerConfig = createFastifyLogger({ pretty: false })

      expect(loggerConfig).not.toHaveProperty("transport")

      process.env.NODE_ENV = originalNodeEnv
    })

    it("should format level correctly", () => {
      const loggerConfig = createFastifyLogger()

      expect(loggerConfig.formatters).toBeDefined()
      expect(loggerConfig.formatters.level).toBeDefined()

      const formatted = loggerConfig.formatters.level("info")
      expect(formatted).toEqual({ level: "INFO" })
    })
  })
})
