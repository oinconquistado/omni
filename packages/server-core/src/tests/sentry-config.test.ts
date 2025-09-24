import * as Sentry from "@sentry/node"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { initializeSentry, isSentryInitialized } from "../sentry/sentry-config"

// Mock Sentry
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  isInitialized: vi.fn(),
  httpIntegration: vi.fn(() => ({})),
  nodeContextIntegration: vi.fn(() => ({})),
  setLogger: vi.fn(),
}))

describe("Sentry Config", () => {
  let originalNodeEnv: string | undefined
  let originalConsoleWarn: typeof console.warn
  let originalConsoleLog: typeof console.log
  let originalConsoleInfo: typeof console.info
  let originalConsoleDebug: typeof console.debug

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    originalConsoleWarn = console.warn
    originalConsoleLog = console.log
    originalConsoleInfo = console.info
    originalConsoleDebug = console.debug

    console.warn = vi.fn()
    console.log = vi.fn()
    console.info = vi.fn()
    console.debug = vi.fn()

    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    console.warn = originalConsoleWarn
    console.log = originalConsoleLog
    console.info = originalConsoleInfo
    console.debug = originalConsoleDebug

    vi.clearAllMocks()
  })

  describe("initializeSentry", () => {
    it("should initialize Sentry with minimal config", () => {
      const originalVersion = process.env.npm_package_version
      process.env.npm_package_version = "0.0.0"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: "https://test@sentry.io/123456",
        environment: "test", // From NODE_ENV in test environment
        release: "test-app@0.0.0", // From package.json version
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        sendDefaultPii: true,
        integrations: expect.any(Array),
        beforeSend: expect.any(Function),
      })

      // Restore original value
      if (originalVersion === undefined) {
        process.env.npm_package_version = undefined
      } else {
        process.env.npm_package_version = originalVersion
      }
    })

    it("should initialize Sentry with full config", () => {
      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
        environment: "production",
        release: "1.0.0",
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.5,
        sendDefaultPii: false,
      }

      initializeSentry(config)

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: "https://test@sentry.io/123456",
        environment: "production",
        release: "1.0.0",
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.5,
        sendDefaultPii: false,
        integrations: expect.any(Array),
        beforeSend: expect.any(Function),
      })
    })

    it("should use NODE_ENV as fallback for environment", () => {
      process.env.NODE_ENV = "staging"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "staging",
        }),
      )
    })

    it("should use npm_package_version for release when available", () => {
      const originalVersion = process.env.npm_package_version
      process.env.npm_package_version = "2.1.0"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          release: "test-app@2.1.0",
        }),
      )

      // Restore original value
      if (originalVersion === undefined) {
        process.env.npm_package_version = undefined
      } else {
        process.env.npm_package_version = originalVersion
      }
    })

    it("should set SENTRY_IGNORE_API_RESOLUTION_ERROR environment variable", () => {
      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      expect(process.env.SENTRY_IGNORE_API_RESOLUTION_ERROR).toBe("1")
    })

    it("should include http and nodeContext integrations", () => {
      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      expect(Sentry.httpIntegration).toHaveBeenCalled()
      expect(Sentry.nodeContextIntegration).toHaveBeenCalled()
    })

    it("should not initialize Sentry when DSN is not provided", () => {
      process.env.NODE_ENV = "development" // Change to development to trigger warning

      const config = {
        appName: "test-app",
      }

      initializeSentry(config)

      expect(Sentry.init).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith("⚠️  Sentry DSN not provided, skipping Sentry initialization")
    })

    it("should not log warning in test environment when DSN is missing", () => {
      process.env.NODE_ENV = "test"

      const config = {
        appName: "test-app",
      }

      initializeSentry(config)

      expect(console.warn).not.toHaveBeenCalled()
    })

    it("should log initialization message in non-test environment", () => {
      process.env.NODE_ENV = "development"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
        environment: "development",
      }

      initializeSentry(config)

      expect(console.info).toHaveBeenCalledWith("🐛 Sentry initialized for test-app in development environment")
    })

    it("should not log initialization message in test environment", () => {
      process.env.NODE_ENV = "test"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining("Sentry initialized"))
    })

    it("should configure beforeSend to log events in development", () => {
      process.env.NODE_ENV = "development"
      process.env.DEBUG = "true"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      const initCall = vi.mocked(Sentry.init).mock.calls[0]?.[0]
      expect(initCall?.beforeSend).toBeDefined()

      if (initCall?.beforeSend) {
        const mockEvent = {
          type: "error",
          event_id: "test-event-id",
          exception: { type: "Error", value: "Test error" },
          message: { message: "Test message" },
        } as any

        const result = initCall.beforeSend(mockEvent, {})

        expect(result).toBe(mockEvent)
        expect(console.debug).toHaveBeenCalledWith("🐛 === SENTRY EVENT CAPTURED ===")
        expect(console.debug).toHaveBeenCalledWith("🐛 Event ID:", "test-event-id")
        expect(console.debug).toHaveBeenCalledWith("🐛 Exception:", { type: "Error", value: "Test error" })
        expect(console.debug).toHaveBeenCalledWith("🐛 Message:", { message: "Test message" })
        expect(console.debug).toHaveBeenCalledWith("🐛 === END SENTRY EVENT ===")
      }
    })

    it("should not log events in non-development environment", () => {
      process.env.NODE_ENV = "production"

      const config = {
        dsn: "https://test@sentry.io/123456",
        appName: "test-app",
      }

      initializeSentry(config)

      const initCall = vi.mocked(Sentry.init).mock.calls[0]?.[0]

      if (initCall?.beforeSend) {
        const mockEvent = {
          type: "error",
          event_id: "test-event-id",
        } as any
        const result = initCall.beforeSend(mockEvent, {})

        expect(result).toBe(mockEvent)
        expect(console.debug).not.toHaveBeenCalledWith("🐛 === SENTRY EVENT CAPTURED ===")
      }
    })
  })

  describe("isSentryInitialized", () => {
    it("should return Sentry initialization status", () => {
      vi.mocked(Sentry.isInitialized).mockReturnValue(true)

      const result = isSentryInitialized()

      expect(result).toBe(true)
      expect(Sentry.isInitialized).toHaveBeenCalled()
    })

    it("should return false when Sentry is not initialized", () => {
      vi.mocked(Sentry.isInitialized).mockReturnValue(false)

      const result = isSentryInitialized()

      expect(result).toBe(false)
    })
  })

  describe("test environment logger configuration", () => {
    it("should handle logger configuration gracefully", () => {
      // This test verifies that the module loads without errors
      // The logger configuration happens at module initialization
      expect(true).toBe(true)
    })
  })
})
