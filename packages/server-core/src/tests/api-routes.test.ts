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
      const [name1, name2, name3] = ["UserService", "AuthAPI", "ProductManager", "OrderProcessor"]

      // Test first name
      vi.clearAllMocks()
      const config1 = { name: name1, version: "1.0.0" }
      await registerApiRoutes(mockFastify, config1)
      const handler1 = mockFastify.get.mock.calls[0][2]
      const result1 = await handler1()
      expect(result1.data.message).toBe(name1)

      // Test second name
      vi.clearAllMocks()
      const config2 = { name: name2, version: "1.0.0" }
      await registerApiRoutes(mockFastify, config2)
      const handler2 = mockFastify.get.mock.calls[0][2]
      const result2 = await handler2()
      expect(result2.data.message).toBe(name2)

      // Test third name
      vi.clearAllMocks()
      const config3 = { name: name3, version: "1.0.0" }
      await registerApiRoutes(mockFastify, config3)
      const handler3 = mockFastify.get.mock.calls[0][2]
      const result3 = await handler3()
      expect(result3.data.message).toBe(name3)
    })

    it("should handle different version formats", async () => {
      const [v1, v2, v3] = ["1.0.0", "2.1.0-alpha", "3.0.0-beta.1", "1.0.0-rc.1", "0.1.0-SNAPSHOT"]

      // Test first version
      vi.clearAllMocks()
      const config1 = { name: "Test API", version: v1 }
      await registerApiRoutes(mockFastify, config1)
      const handler1 = mockFastify.get.mock.calls[0][2]
      const result1 = await handler1()
      expect(result1.data.version).toBe(v1)

      // Test second version
      vi.clearAllMocks()
      const config2 = { name: "Test API", version: v2 }
      await registerApiRoutes(mockFastify, config2)
      const handler2 = mockFastify.get.mock.calls[0][2]
      const result2 = await handler2()
      expect(result2.data.version).toBe(v2)

      // Test third version
      vi.clearAllMocks()
      const config3 = { name: "Test API", version: v3 }
      await registerApiRoutes(mockFastify, config3)
      const handler3 = mockFastify.get.mock.calls[0][2]
      const result3 = await handler3()
      expect(result3.data.version).toBe(v3)
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
      await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay to ensure different timestamps
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
      // The function doesn't validate config, so it will register but handler will throw
      await registerApiRoutes(mockFastify, null as any)

      const handler = mockFastify.get.mock.calls[0][2]

      // When config is null, accessing config.name and config.version will throw
      await expect(async () => await handler()).rejects.toThrow()
    })

    it("should handle undefined config", async () => {
      // The function doesn't validate config, so it will register but handler will throw
      await registerApiRoutes(mockFastify, undefined as any)

      const handler = mockFastify.get.mock.calls[0][2]

      // When config is undefined, accessing config.name and config.version will throw
      await expect(async () => await handler()).rejects.toThrow()
    })

    it("should handle config without name", async () => {
      const config = { version: "1.0.0" } as any

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      // When name is missing, it will be undefined in the response
      expect(result.data.message).toBeUndefined()
      expect(result.data.version).toBe("1.0.0")
    })

    it("should handle config without version", async () => {
      const config = { name: "Test API" } as any

      await registerApiRoutes(mockFastify, config)

      const handler = mockFastify.get.mock.calls[0][2]
      const result = await handler()

      // When version is missing, it will be undefined in the response
      expect(result.data.message).toBe("Test API")
      expect(result.data.version).toBeUndefined()
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
      const [name1, name2, name3] = [123, true, []]

      // Test each non-string name individually
      vi.clearAllMocks()
      const config1 = { name: name1, version: "1.0.0" } as any
      await registerApiRoutes(mockFastify, config1)
      const handler1 = mockFastify.get.mock.calls[0][2]
      const result1 = await handler1()
      expect(result1).toHaveProperty("data")
      expect(result1.data.message).toBe(name1)

      vi.clearAllMocks()
      const config2 = { name: name2, version: "1.0.0" } as any
      await registerApiRoutes(mockFastify, config2)
      const handler2 = mockFastify.get.mock.calls[0][2]
      const result2 = await handler2()
      expect(result2.data.message).toBe(name2)

      vi.clearAllMocks()
      const config3 = { name: name3, version: "1.0.0" } as any
      await registerApiRoutes(mockFastify, config3)
      const handler3 = mockFastify.get.mock.calls[0][2]
      const result3 = await handler3()
      expect(result3.data.message).toBe(name3)
    })

    it("should handle non-string version", async () => {
      const [version1, version2, version3] = [123, true, []]

      // Test each non-string version individually
      vi.clearAllMocks()
      const config1 = { name: "Test API", version: version1 } as any
      await registerApiRoutes(mockFastify, config1)
      const handler1 = mockFastify.get.mock.calls[0][2]
      const result1 = await handler1()
      expect(result1).toHaveProperty("data")
      expect(result1.data.version).toBe(version1)

      vi.clearAllMocks()
      const config2 = { name: "Test API", version: version2 } as any
      await registerApiRoutes(mockFastify, config2)
      const handler2 = mockFastify.get.mock.calls[0][2]
      const result2 = await handler2()
      expect(result2.data.version).toBe(version2)

      vi.clearAllMocks()
      const config3 = { name: "Test API", version: version3 } as any
      await registerApiRoutes(mockFastify, config3)
      const handler3 = mockFastify.get.mock.calls[0][2]
      const result3 = await handler3()
      expect(result3.data.version).toBe(version3)
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
      const extremeValues = [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]

      const results: any[] = []

      // Test each timestamp value individually
      const [ts1, ts2, ts3, ts4] = extremeValues

      // Test first timestamp
      vi.clearAllMocks()
      Date.now = vi.fn().mockReturnValue(ts1)
      await registerApiRoutes(mockFastify, config)
      const handler1 = mockFastify.get.mock.calls[0][2]
      const result1 = await handler1()
      results.push(result1)

      // Test second timestamp
      vi.clearAllMocks()
      Date.now = vi.fn().mockReturnValue(ts2)
      await registerApiRoutes(mockFastify, config)
      const handler2 = mockFastify.get.mock.calls[0][2]
      const result2 = await handler2()
      results.push(result2)

      // Test third timestamp
      vi.clearAllMocks()
      Date.now = vi.fn().mockReturnValue(ts3)
      await registerApiRoutes(mockFastify, config)
      const handler3 = mockFastify.get.mock.calls[0][2]
      const result3 = await handler3()
      results.push(result3)

      // Test fourth timestamp
      vi.clearAllMocks()
      Date.now = vi.fn().mockReturnValue(ts4)
      await registerApiRoutes(mockFastify, config)
      const handler4 = mockFastify.get.mock.calls[0][2]
      const result4 = await handler4()
      results.push(result4)

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
