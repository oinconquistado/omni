import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerHealthRoutes } from "../routes/health-routes"

describe("Health Routes", () => {
  let mockFastify: any

  beforeEach(() => {
    mockFastify = {
      get: vi.fn(),
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Positive Cases", () => {
    it("should register basic health route", async () => {
      await registerHealthRoutes(mockFastify)

      expect(mockFastify.get).toHaveBeenCalledWith(
        "/health",
        {
          schema: {
            description: "Health check endpoint",
            tags: ["Health"],
          },
        },
        expect.any(Function),
      )
    })

    it("should register database health route when checkDatabase is provided", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: 50 },
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      expect(mockFastify.get).toHaveBeenCalledTimes(2)
      expect(mockFastify.get).toHaveBeenCalledWith(
        "/health/database",
        {
          schema: {
            description: "Database health check endpoint",
            tags: ["Health"],
          },
        },
        expect.any(Function),
      )
    })

    it("should return healthy status for basic health check", async () => {
      await registerHealthRoutes(mockFastify)

      const healthHandler = mockFastify.get.mock.calls[0][2]
      const result = await healthHandler()

      expect(result).toEqual({
        success: true,
        data: {
          status: "healthy",
          timestamp: expect.any(Number),
        },
        timestamp: expect.any(Number),
      })
    })

    it("should return database health check with healthy status", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: 25 },
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]
      const result = await dbHealthHandler()

      expect(mockCheckDatabase).toHaveBeenCalledOnce()
      expect(result).toEqual({
        success: true,
        data: {
          status: "healthy",
          timestamp: expect.any(Number),
          database: {
            connected: true,
            latency: 25,
          },
        },
        timestamp: expect.any(Number),
      })
    })

    it("should return database health check with unhealthy status", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "unhealthy",
        details: { error: "Connection timeout" },
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]
      const result = await dbHealthHandler()

      expect(result).toEqual({
        success: true,
        data: {
          status: "unhealthy",
          timestamp: expect.any(Number),
          database: {
            connected: false,
            latency: undefined,
          },
        },
        timestamp: expect.any(Number),
      })
    })

    it("should handle database response without details", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "healthy",
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]
      const result = await dbHealthHandler()

      expect(result.data.database.latency).toBeUndefined()
    })

    it("should handle different database status values", async () => {
      const [status1, status2, status3, status4] = ["healthy", "degraded", "critical", "unknown"]

      // Test first status
      vi.clearAllMocks()
      const mockCheckDatabase1 = vi.fn().mockResolvedValue({
        status: status1,
        details: { latency: 100 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase1 })
      const dbHealthHandler1 = mockFastify.get.mock.calls[1][2]
      const result1 = await dbHealthHandler1()

      // Test second status
      vi.clearAllMocks()
      const mockCheckDatabase2 = vi.fn().mockResolvedValue({
        status: status2,
        details: { latency: 100 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase2 })
      const dbHealthHandler2 = mockFastify.get.mock.calls[1][2]
      const result2 = await dbHealthHandler2()

      // Test third status
      vi.clearAllMocks()
      const mockCheckDatabase3 = vi.fn().mockResolvedValue({
        status: status3,
        details: { latency: 100 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase3 })
      const dbHealthHandler3 = mockFastify.get.mock.calls[1][2]
      const result3 = await dbHealthHandler3()

      // Test fourth status
      vi.clearAllMocks()
      const mockCheckDatabase4 = vi.fn().mockResolvedValue({
        status: status4,
        details: { latency: 100 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase4 })
      const dbHealthHandler4 = mockFastify.get.mock.calls[1][2]
      const result4 = await dbHealthHandler4()

      const results = [result1, result2, result3, result4]
      const statuses = [status1, status2, status3, status4]

      results.forEach((result, index) => {
        expect(result.data.status).toBe(statuses[index])
        expect(result.data.database.connected).toBe(statuses[index] === "healthy")
      })
    })

    it("should handle multiple registrations on same fastify instance", async () => {
      // Register first set of routes
      await registerHealthRoutes(mockFastify)

      // Register second set with database check
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: 30 },
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      expect(mockFastify.get).toHaveBeenCalledTimes(3) // 1 + 2 routes
    })

    it("should handle concurrent health checks", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: 15 },
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const healthHandler = mockFastify.get.mock.calls[0][2]
      const dbHealthHandler = mockFastify.get.mock.calls[1][2]

      const promises = [healthHandler(), dbHealthHandler(), healthHandler(), dbHealthHandler()]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(4)
      expect(mockCheckDatabase).toHaveBeenCalledTimes(2)
      expect(results.every((result) => result.success)).toBe(true)
    })
  })

  describe("Negative Cases", () => {
    it("should not register database route when checkDatabase is not provided", async () => {
      await registerHealthRoutes(mockFastify)

      expect(mockFastify.get).toHaveBeenCalledTimes(1)
      expect(mockFastify.get).not.toHaveBeenCalledWith("/health/database", expect.anything(), expect.anything())
    })

    it("should handle database check function throwing an error", async () => {
      const mockCheckDatabase = vi.fn().mockRejectedValue(new Error("Database connection failed"))

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]

      await expect(dbHealthHandler()).rejects.toThrow("Database connection failed")
    })

    it("should handle database check function returning invalid data", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue(null)

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]

      await expect(dbHealthHandler()).rejects.toThrow()
    })

    it("should handle database check function returning undefined", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue(undefined)

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]

      await expect(dbHealthHandler()).rejects.toThrow()
    })

    it("should handle fastify.get method throwing an error", async () => {
      mockFastify.get.mockImplementation(() => {
        throw new Error("Route registration failed")
      })

      await expect(registerHealthRoutes(mockFastify)).rejects.toThrow("Route registration failed")
    })

    it("should handle null fastify instance", async () => {
      await expect(registerHealthRoutes(null as any)).rejects.toThrow()
    })

    it("should handle undefined fastify instance", async () => {
      await expect(registerHealthRoutes(undefined as any)).rejects.toThrow()
    })

    it("should handle fastify without get method", async () => {
      const invalidFastify = {} as any

      await expect(registerHealthRoutes(invalidFastify)).rejects.toThrow()
    })

    it("should handle database check timeout scenarios", async () => {
      vi.useFakeTimers()

      const mockCheckDatabase = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ status: "healthy" }), 10000)
          }),
      )

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]
      const resultPromise = dbHealthHandler()

      // Advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(11000)

      const result = await resultPromise

      expect(result.data.status).toBe("healthy")

      vi.useRealTimers()
    })

    it("should handle empty options object", async () => {
      await registerHealthRoutes(mockFastify, {})

      expect(mockFastify.get).toHaveBeenCalledTimes(1) // Only basic health route
    })

    it("should handle options with undefined checkDatabase", async () => {
      await registerHealthRoutes(mockFastify, {
        checkDatabase: undefined,
      })

      expect(mockFastify.get).toHaveBeenCalledTimes(1) // Only basic health route
    })

    it("should handle database check returning non-object values", async () => {
      const invalidValues = ["healthy", 123, true, [], null]

      const results = await Promise.all(
        invalidValues.map(async (value) => {
          vi.clearAllMocks()

          const mockCheckDatabase = vi.fn().mockResolvedValue(value)

          await registerHealthRoutes(mockFastify, {
            checkDatabase: mockCheckDatabase,
          })

          const dbHealthHandler = mockFastify.get.mock.calls[1][2]

          try {
            await dbHealthHandler()
            return { success: true }
          } catch (error) {
            return { success: false, error }
          }
        }),
      )

      // Most should fail due to invalid structure
      const failedChecks = results.filter((r) => !r.success)
      expect(failedChecks.length).toBeGreaterThan(0)
    })

    it("should handle database check returning object without status", async () => {
      const mockCheckDatabase = vi.fn().mockResolvedValue({
        details: { latency: 50 },
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]
      const result = await dbHealthHandler()

      expect(result.data.status).toBeUndefined()
      expect(result.data.database.connected).toBe(false)
    })

    it("should handle extreme latency values", async () => {
      const [latency1, latency2, latency3] = [0, -1, Infinity]

      // Test first latency
      vi.clearAllMocks()
      const mockCheckDatabase1 = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: latency1 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase1 })
      const dbHealthHandler1 = mockFastify.get.mock.calls[1][2]
      const result1 = await dbHealthHandler1()

      // Test second latency
      vi.clearAllMocks()
      const mockCheckDatabase2 = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: latency2 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase2 })
      const dbHealthHandler2 = mockFastify.get.mock.calls[1][2]
      const result2 = await dbHealthHandler2()

      // Test third latency
      vi.clearAllMocks()
      const mockCheckDatabase3 = vi.fn().mockResolvedValue({
        status: "healthy",
        details: { latency: latency3 },
      })
      await registerHealthRoutes(mockFastify, { checkDatabase: mockCheckDatabase3 })
      const dbHealthHandler3 = mockFastify.get.mock.calls[1][2]
      const result3 = await dbHealthHandler3()

      const results = [result1, result2, result3]
      const extremeValues = [latency1, latency2, latency3]

      results.forEach((result, index) => {
        expect(result.data.database.latency).toBe(extremeValues[index])
      })
    })

    it("should handle memory pressure during health checks", async () => {
      const mockCheckDatabase = vi.fn().mockImplementation(() => {
        // Simulate memory pressure
        const largeArray = new Array(10000).fill("memory pressure test")
        return Promise.resolve({
          status: "healthy",
          details: { largeArray },
        })
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]

      const promises = Array.from({ length: 10 }, () => dbHealthHandler())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it("should handle circular references in database details", async () => {
      const circularDetails: any = { status: "healthy" }
      circularDetails.self = circularDetails

      const mockCheckDatabase = vi.fn().mockResolvedValue({
        status: "healthy",
        details: circularDetails,
      })

      await registerHealthRoutes(mockFastify, {
        checkDatabase: mockCheckDatabase,
      })

      const dbHealthHandler = mockFastify.get.mock.calls[1][2]
      const result = await dbHealthHandler()

      expect(result.data.status).toBe("healthy")
    })

    it("should handle invalid schema definition", async () => {
      mockFastify.get.mockImplementation((_path: any, schema: any) => {
        if (schema && typeof schema === "object" && schema.schema) {
          throw new Error("Invalid schema definition")
        }
        return Promise.resolve()
      })

      await expect(registerHealthRoutes(mockFastify)).rejects.toThrow("Invalid schema definition")
    })

    it("should handle prototype pollution in options", async () => {
      const maliciousOptions = {
        __proto__: { polluted: true },
        constructor: { prototype: { polluted: true } },
        checkDatabase: vi.fn().mockResolvedValue({ status: "healthy" }),
      } as any

      await registerHealthRoutes(mockFastify, maliciousOptions)

      expect(mockFastify.get).toHaveBeenCalledTimes(2)
    })
  })
})
