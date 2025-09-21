import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerApiRoutes } from "../routes/api-routes"

describe("API Routes", () => {
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
    it("should register root API route", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      expect(mockFastify.get).toHaveBeenCalledWith(
        "/",
        {
          schema: {
            description: "API root endpoint",
            tags: ["General"],
          },
        },
        expect.any(Function),
      )
    })

    it("should return correct API info for basic config", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result).toEqual({
        success: true,
        data: {
          message: "Test API",
          version: "1.0.0",
        },
        timestamp: expect.any(Number),
      })
    })

    it("should handle different API names", async () => {
      const configs = [
        { name: "User Service", version: "1.0.0" },
        { name: "Payment API", version: "2.1.0" },
        { name: "Notification Service", version: "1.5.3" },
      ]

      const results = await Promise.all(
        configs.map(async (config) => {
          vi.clearAllMocks()
          await registerApiRoutes(mockFastify, config)

          const handler = mockFastify.get.mock.calls[0][2]
          return await handler()
        }),
      )

      results.forEach((result, index) => {
        const config = configs[index]
        if (config) {
          expect(result.data.message).toBe(config.name)
          expect(result.data.version).toBe(config.version)
        }
      })
    })

    it("should handle different version formats", async () => {
      const versionFormats = ["1.0.0", "2.1.0-alpha", "3.0.0-beta.1", "1.0.0-rc.1", "0.1.0-SNAPSHOT"]

      const results = await Promise.all(
        versionFormats.map(async (version) => {
          vi.clearAllMocks()
          const config = { name: "Test API", version }

          await registerApiRoutes(mockFastify, config)

          const handler = mockFastify.get.mock.calls[0][2]
          return await handler()
        }),
      )

      results.forEach((result, index) => {
        expect(result.data.version).toBe(versionFormats[index])
      })
    })

    it("should handle special characters in API name", async () => {
      const config = { name: "My-API_Service@2024 🚀", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("My-API_Service@2024 🚀")
    })

    it("should handle unicode characters in name and version", async () => {
      const config = { name: "API 中文 العربية", version: "1.0.0-β" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("API 中文 العربية")
      expect(result.data.version).toBe("1.0.0-β")
    })

    it("should handle concurrent requests", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]

      const promises = Array.from({ length: 10 }, () => handler())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      expect(results.every((r) => r.success)).toBe(true)
      expect(results.every((r) => r.data.message === "Test API")).toBe(true)
    })

    it("should generate different timestamps for each call", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]

      const result1 = await handler()
      await new Promise((resolve) => setTimeout(resolve, 1)) // Small delay
      const result2 = await handler()

      expect(result1.timestamp).not.toBe(result2.timestamp)
    })

    it("should handle very long API names", async () => {
      const config = { name: "A".repeat(1000), version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("A".repeat(1000))
    })

    it("should handle multiple registrations on same fastify instance", async () => {
      const config1 = { name: "API 1", version: "1.0.0" }
      const config2 = { name: "API 2", version: "2.0.0" }

      await registerApiRoutes(mockFastify, config1)
      await registerApiRoutes(mockFastify, config2)

      expect(mockFastify.get).toHaveBeenCalledTimes(2)
    })
  })

  describe("Negative Cases", () => {
    it("should handle null fastify instance", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await expect(registerApiRoutes(null as any, config)).rejects.toThrow()
    })

    it("should handle undefined fastify instance", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await expect(registerApiRoutes(undefined as any, config)).rejects.toThrow()
    })

    it("should handle fastify without get method", async () => {
      const invalidFastify = {} as any
      const config = { name: "Test API", version: "1.0.0" }

      await expect(registerApiRoutes(invalidFastify, config)).rejects.toThrow()
    })

    it("should handle null config", async () => {
      await expect(registerApiRoutes(mockFastify, null as any)).rejects.toThrow()
    })

    it("should handle undefined config", async () => {
      await expect(registerApiRoutes(mockFastify, undefined as any)).rejects.toThrow()
    })

    it("should handle config without name", async () => {
      const config = { version: "1.0.0" } as any

      await expect(registerApiRoutes(mockFastify, config)).rejects.toThrow()
    })

    it("should handle config without version", async () => {
      const config = { name: "Test API" } as any

      await expect(registerApiRoutes(mockFastify, config)).rejects.toThrow()
    })

    it("should handle empty name", async () => {
      const config = { name: "", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("")
    })

    it("should handle empty version", async () => {
      const config = { name: "Test API", version: "" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.version).toBe("")
    })

    it("should handle whitespace-only name", async () => {
      const config = { name: "   \n\t   ", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("   \n\t   ")
    })

    it("should handle whitespace-only version", async () => {
      const config = { name: "Test API", version: "   \n\t   " }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.version).toBe("   \n\t   ")
    })

    it("should handle fastify.get throwing an error", async () => {
      mockFastify.get.mockImplementation(() => {
        throw new Error("Route registration failed")
      })

      const config = { name: "Test API", version: "1.0.0" }

      await expect(registerApiRoutes(mockFastify, config)).rejects.toThrow("Route registration failed")
    })

    it("should handle non-string name", async () => {
      const invalidNames = [123, true, [], {}, null, undefined]

      const results = await Promise.all(
        invalidNames.map(async (name) => {
          vi.clearAllMocks()
          const config = { name, version: "1.0.0" } as any

          try {
            await registerApiRoutes(mockFastify, config)
            const handler = mockFastify.get.mock.calls[0][2]
            const result = await handler()
            return { success: true, result }
          } catch (error) {
            return { success: false, error }
          }
        }),
      )

      // Some may succeed (type coercion) or fail
      results.forEach((result, index) => {
        if (result.success) {
          // Verify that non-string values are handled
          expect(result.result.data.message).toBe(invalidNames[index])
        }
      })
    })

    it("should handle non-string version", async () => {
      const invalidVersions = [123, true, [], {}, null, undefined]

      const results = await Promise.all(
        invalidVersions.map(async (version) => {
          vi.clearAllMocks()
          const config = { name: "Test API", version } as any

          try {
            await registerApiRoutes(mockFastify, config)
            const handler = mockFastify.get.mock.calls[0][2]
            const result = await handler()
            return { success: true, result }
          } catch (error) {
            return { success: false, error }
          }
        }),
      )

      // Some may succeed (type coercion) or fail
      results.forEach((result, index) => {
        if (result.success) {
          // Verify that non-string values are handled
          expect(result.result.data.version).toBe(invalidVersions[index])
        }
      })
    })

    it("should handle circular reference in config", async () => {
      const circularConfig: any = {
        name: "Test API",
        version: "1.0.0",
      }
      circularConfig.self = circularConfig // Create circular reference

      await registerApiRoutes(mockFastify, circularConfig)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("Test API")
      expect(result.data.version).toBe("1.0.0")
    })

    it("should handle prototype pollution attempt", async () => {
      const maliciousConfig = {
        name: "Test API",
        version: "1.0.0",
        __proto__: { polluted: true },
        constructor: { prototype: { polluted: true } },
      } as any

      await registerApiRoutes(mockFastify, maliciousConfig)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("Test API")
      expect(result.data.version).toBe("1.0.0")
    })

    it("should handle extreme timestamp values", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      // Mock Date.now to return extreme values
      const originalDateNow = Date.now
      const extremeValues = [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]

      const results = await Promise.all(
        extremeValues.map(async (timestamp) => {
          Date.now = vi.fn().mockReturnValue(timestamp)

          await registerApiRoutes(mockFastify, config)
          const handler = mockFastify.get.mock.calls[0][2]

          const result = await handler()

          vi.clearAllMocks()
          return result
        }),
      )

      Date.now = originalDateNow

      results.forEach((result, index) => {
        expect(result.timestamp).toBe(extremeValues[index])
      })
    })

    it("should handle memory pressure scenarios", async () => {
      const config = { name: "Test API", version: "1.0.0" }

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]

      // Simulate memory pressure with many concurrent calls
      const promises = Array.from({ length: 100 }, () => handler())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it("should handle invalid schema definition", async () => {
      mockFastify.get.mockImplementation((_path: any, schema: any) => {
        if (schema && typeof schema === "object" && schema.schema) {
          throw new Error("Invalid schema definition")
        }
        return Promise.resolve()
      })

      const config = { name: "Test API", version: "1.0.0" }

      await expect(registerApiRoutes(mockFastify, config)).rejects.toThrow("Invalid schema definition")
    })

    it("should handle config with additional properties", async () => {
      const configWithExtras = {
        name: "Test API",
        version: "1.0.0",
        extraProperty: "should be ignored",
        anotherExtra: 123,
      }

      await registerApiRoutes(mockFastify, configWithExtras)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      expect(result.data.message).toBe("Test API")
      expect(result.data.version).toBe("1.0.0")
      expect(result.data).not.toHaveProperty("extraProperty")
      expect(result.data).not.toHaveProperty("anotherExtra")
    })
  })
})
