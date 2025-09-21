import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createFastifyLogger, createLogger } from "../logger/logger-config"

const TIMESTAMP_REGEX = /,"time":".*"/

describe("Logger Config", () => {
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
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

    it("should create a logger with different log levels", () => {
      const levels = ["trace", "debug", "info", "warn", "error", "fatal"]

      levels.forEach((level) => {
        const logger = createLogger({ level })
        expect(logger.level).toBe(level)
      })
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
    })

    it("should handle development environment with pretty printing", () => {
      process.env.NODE_ENV = "development"

      const logger = createLogger({ pretty: true })

      expect(logger).toBeDefined()
    })

    it("should handle staging environment", () => {
      process.env.NODE_ENV = "staging"

      const logger = createLogger()

      expect(logger).toBeDefined()
    })

    it("should handle undefined environment", () => {
      process.env.NODE_ENV = undefined

      const logger = createLogger()

      expect(logger).toBeDefined()
      expect(logger.level).toBe("info")
    })

    // Negative test cases
    it("should handle invalid log level gracefully", () => {
      const logger = createLogger({ level: "invalid-level" as any })

      expect(logger).toBeDefined()
      // Pino should handle invalid levels by defaulting or throwing
    })

    it("should handle empty string as app name", () => {
      const logger = createLogger({ appName: "" })

      expect(logger).toBeDefined()
    })

    it("should handle null app name", () => {
      const logger = createLogger({ appName: null as any })

      expect(logger).toBeDefined()
    })

    it("should handle undefined app name", () => {
      const logger = createLogger({ appName: undefined })

      expect(logger).toBeDefined()
    })

    it("should handle extreme config combinations", () => {
      const logger = createLogger({
        level: "trace",
        appName: "very-long-app-name-that-might-cause-issues-with-some-systems-or-loggers",
        pretty: true,
      })

      expect(logger).toBeDefined()
      expect(logger.level).toBe("trace")
    })

    it("should handle boolean false for pretty", () => {
      const logger = createLogger({ pretty: false })

      expect(logger).toBeDefined()
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
      if ("transport" in loggerConfig && loggerConfig.transport && typeof loggerConfig.transport === "object") {
        expect(loggerConfig.transport.target).toBe("pino-pretty")
        expect(loggerConfig.transport.options).toBeDefined()
        expect(loggerConfig.transport.options.colorize).toBe(true)
      }
    })

    it("should not include transport config for production", () => {
      process.env.NODE_ENV = "production"

      const loggerConfig = createFastifyLogger({ pretty: false })

      expect(loggerConfig).not.toHaveProperty("transport")
    })

    it("should format level correctly", () => {
      const loggerConfig = createFastifyLogger()

      expect(loggerConfig.formatters).toBeDefined()
      expect(loggerConfig.formatters.level).toBeDefined()

      const formatted = loggerConfig.formatters.level("info")
      expect(formatted).toEqual({ level: "INFO" })
    })

    it("should format different log levels correctly", () => {
      const loggerConfig = createFastifyLogger()
      const levels = ["trace", "debug", "info", "warn", "error", "fatal"]

      levels.forEach((level) => {
        const formatted = loggerConfig.formatters.level(level)
        expect(formatted).toEqual({ level: level.toUpperCase() })
      })
    })

    // Negative test cases
    it("should handle invalid log level in formatter", () => {
      const loggerConfig = createFastifyLogger()

      const formatted = loggerConfig.formatters.level("invalid-level")
      expect(formatted).toEqual({ level: "INVALID-LEVEL" })
    })

    it("should handle empty string level in formatter", () => {
      const loggerConfig = createFastifyLogger()

      const formatted = loggerConfig.formatters.level("")
      expect(formatted).toEqual({ level: "" })
    })

    it("should handle null level in formatter", () => {
      const loggerConfig = createFastifyLogger()

      const formatted = loggerConfig.formatters.level(null as any)
      expect(formatted).toEqual({ level: "NULL" })
    })

    it("should handle undefined level in formatter", () => {
      const loggerConfig = createFastifyLogger()

      const formatted = loggerConfig.formatters.level(undefined as any)
      expect(formatted).toEqual({ level: "UNDEFINED" })
    })

    it("should handle invalid config options", () => {
      const loggerConfig = createFastifyLogger({
        level: "invalid-level" as any,
        appName: null as any,
        pretty: "invalid" as any,
      })

      expect(loggerConfig).toBeDefined()
      expect(loggerConfig.level).toBe("invalid-level") // Should pass through
      expect(loggerConfig.name).toBe("null")
    })

    it("should handle extreme app name lengths", () => {
      const veryLongName = "a".repeat(1000)
      const loggerConfig = createFastifyLogger({ appName: veryLongName })

      expect(loggerConfig.name).toBe(veryLongName)
    })

    it("should handle special characters in app name", () => {
      const specialName = "app-name-with-special!@#$%^&*()characters"
      const loggerConfig = createFastifyLogger({ appName: specialName })

      expect(loggerConfig.name).toBe(specialName)
    })

    it("should handle unicode characters in app name", () => {
      const unicodeName = "app-name-with-unicode-🚀-characters"
      const loggerConfig = createFastifyLogger({ appName: unicodeName })

      expect(loggerConfig.name).toBe(unicodeName)
    })

    it("should configure timestamp function correctly", () => {
      const loggerConfig = createFastifyLogger()

      expect(typeof loggerConfig.timestamp).toBe("function")

      // Test timestamp function
      const timestamp = loggerConfig.timestamp()
      expect(timestamp).toMatch(TIMESTAMP_REGEX)
    })

    it("should handle pretty printing in test environment", () => {
      process.env.NODE_ENV = "test"

      const loggerConfig = createFastifyLogger({ pretty: true })

      // In test environment, pretty printing might be handled differently
      expect(loggerConfig).toBeDefined()
    })

    it("should handle missing NODE_ENV", () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = undefined

      const loggerConfig = createFastifyLogger({ pretty: true })

      expect(loggerConfig).toBeDefined()

      process.env.NODE_ENV = originalEnv
    })

    it("should maintain object structure integrity", () => {
      const loggerConfig = createFastifyLogger({
        level: "debug",
        appName: "test-integrity",
        pretty: false,
      })

      // Verify all expected properties are present
      expect(loggerConfig).toHaveProperty("level")
      expect(loggerConfig).toHaveProperty("name")
      expect(loggerConfig).toHaveProperty("timestamp")
      expect(loggerConfig).toHaveProperty("formatters")
      expect(loggerConfig.formatters).toHaveProperty("level")
    })

    it("should handle concurrent logger creation", async () => {
      // Test creating multiple loggers concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(createFastifyLogger({ appName: `concurrent-${i}` })),
      )

      const loggers = await Promise.all(promises)

      loggers.forEach((logger, index) => {
        expect(logger).toBeDefined()
        expect(logger.name).toBe(`concurrent-${index}`)
      })
    })

    it("should handle memory pressure scenarios", () => {
      // Create many logger configs to test memory handling
      const configs = Array.from({ length: 100 }, (_, i) => createFastifyLogger({ appName: `memory-test-${i}` }))

      configs.forEach((config, index) => {
        expect(config).toBeDefined()
        expect(config.name).toBe(`memory-test-${index}`)
      })

      // Verify the last one is still correct
      const lastConfig = configs[99]
      if (lastConfig) {
        expect(lastConfig.name).toBe("memory-test-99")
      }
    })

    it("should preserve logger config immutability", () => {
      const config1 = createFastifyLogger({ level: "info" })
      const config2 = createFastifyLogger({ level: "debug" })

      expect(config1.level).toBe("info")
      expect(config2.level).toBe("debug")

      // Configs should be independent
      expect(config1.level).not.toBe(config2.level)
    })
  })
})
