import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Declare mock functions before using them in vi.mock
const mockValidatorCompiler = vi.fn()
const mockSerializerCompiler = vi.fn(() => vi.fn((data: unknown) => JSON.stringify(data)))
const mockRegisterRequestLogging = vi.fn().mockResolvedValue(undefined)

import { createServer } from "../server/create-server"

// Mock fastify
const mockFastifyInstance = {
  withTypeProvider: vi.fn().mockReturnThis(),
  setValidatorCompiler: vi.fn(),
  setSerializerCompiler: vi.fn(),
  register: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  ready: vi.fn().mockResolvedValue(undefined),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}

const mockFastifyConstructor = vi.fn(() => mockFastifyInstance)

vi.mock("fastify", () => ({
  default: mockFastifyConstructor,
}))

// Mock fastify-type-provider-zod
vi.mock("fastify-type-provider-zod", () => ({
  jsonSchemaTransform: {},
  serializerCompiler: mockSerializerCompiler,
  validatorCompiler: mockValidatorCompiler,
  ZodTypeProvider: {},
}))

// Mock request logging
vi.mock("../middleware/request-logging", () => ({
  registerRequestLogging: mockRegisterRequestLogging,
}))

// Mock logger config
const mockCreateFastifyLogger = vi.fn(() => ({
  level: "info",
  name: "test-server",
}))
vi.mock("../logger/logger-config", () => ({
  createFastifyLogger: mockCreateFastifyLogger,
}))

describe("Create Server", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Positive Cases", () => {
    it("should create a fastify server with basic config", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      const server = await createServer(config)

      expect(mockFastifyConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: expect.any(Object),
          requestIdLogLabel: "requestId",
          genReqId: expect.any(Function),
        }),
      )
      expect(mockFastifyInstance.withTypeProvider).toHaveBeenCalled()
      expect(mockFastifyInstance.setValidatorCompiler).toHaveBeenCalled()
      expect(mockFastifyInstance.setSerializerCompiler).toHaveBeenCalled()
      expect(server).toBe(mockFastifyInstance)
    })

    it("should create a server with custom logger config", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
        logger: {
          level: "debug",
          pretty: true,
        },
      }

      await createServer(config)

      expect(mockCreateFastifyLogger).toHaveBeenCalledWith({
        appName: "test-server",
        level: "debug",
        pretty: true,
      })
    })

    it("should register swagger when enabled", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
        enableSwagger: true,
      }

      await createServer(config)

      expect(mockFastifyInstance.register).toHaveBeenCalledWith(
        expect.any(Promise), // import("@fastify/swagger")
        expect.objectContaining({
          openapi: expect.objectContaining({
            info: {
              title: "test-server API",
              description: "API documentation for test-server",
              version: "1.0.0",
            },
            servers: [
              {
                url: "http://localhost:3000",
                description: "Local development server",
              },
              {
                url: "http://0.0.0.0:3000",
                description: "Network development server",
              },
            ],
            components: {
              securitySchemes: {
                bearerAuth: {
                  type: "http",
                  scheme: "bearer",
                  bearerFormat: "JWT",
                },
              },
            },
          }),
        }),
      )
    })

    it("should not register swagger when disabled", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
        enableSwagger: false,
      }

      await createServer(config)

      // Swagger should not be registered (register should not be called for swagger)
      const swaggerRegisterCalls = mockFastifyInstance.register.mock.calls.filter((call) => call[1]?.openapi)
      expect(swaggerRegisterCalls).toHaveLength(0)
    })

    it("should register request logging", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await createServer(config)

      expect(mockRegisterRequestLogging).toHaveBeenCalledWith(mockFastifyInstance)
    })

    it("should generate unique request IDs", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await createServer(config)

      expect(mockFastifyConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          genReqId: expect.any(Function),
        }),
      )

      const call = mockFastifyConstructor.mock.calls[0] as any
      const genReqId = call?.[0]?.genReqId
      if (genReqId) {
        const id1 = genReqId()
        const id2 = genReqId()
        expect(id1).toBeTruthy()
        expect(id2).toBeTruthy()
        expect(id1).not.toBe(id2) // Should generate unique IDs
      }
    })

    it("should create server with different port configurations", async () => {
      const config = { name: "server1", version: "1.0.0", port: 3001, enableSwagger: true }

      vi.clearAllMocks()
      await createServer(config)

      // Check that swagger was configured with correct server URLs
      expect(mockFastifyInstance.register).toHaveBeenCalledWith(
        expect.any(Promise),
        expect.objectContaining({
          openapi: expect.objectContaining({
            servers: [
              {
                url: "http://localhost:3001",
                description: "Local development server",
              },
              {
                url: "http://0.0.0.0:3001",
                description: "Network development server",
              },
            ],
          }),
        }),
      )
    })

    it("should handle async import of Fastify", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      const server = await createServer(config)

      expect(server).toBe(mockFastifyInstance)
      expect(mockFastifyConstructor).toHaveBeenCalled()
    })
  })

  describe("Negative Cases", () => {
    it("should handle Fastify import failure", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      // Mock dynamic import failure
      vi.doMock("fastify", () => {
        throw new Error("Failed to import Fastify")
      })

      await expect(createServer(config)).rejects.toThrow("Failed to import Fastify")
    })

    it("should handle Fastify constructor errors", async () => {
      mockFastifyConstructor.mockImplementation(() => {
        throw new Error("Fastify constructor failed")
      })

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await expect(createServer(config)).rejects.toThrow("Fastify constructor failed")
    })

    it("should handle logger creation errors", async () => {
      mockCreateFastifyLogger.mockImplementation(() => {
        throw new Error("Logger creation failed")
      })

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await expect(createServer(config)).rejects.toThrow("Logger creation failed")
    })

    it("should handle setValidatorCompiler errors", async () => {
      mockFastifyInstance.setValidatorCompiler.mockImplementation(() => {
        throw new Error("Validator compiler setup failed")
      })

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await expect(createServer(config)).rejects.toThrow("Validator compiler setup failed")
    })

    it("should handle setSerializerCompiler errors", async () => {
      mockFastifyInstance.setSerializerCompiler.mockImplementation(() => {
        throw new Error("Serializer compiler setup failed")
      })

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await expect(createServer(config)).rejects.toThrow("Serializer compiler setup failed")
    })

    it("should handle request logging registration errors", async () => {
      mockRegisterRequestLogging.mockRejectedValue(new Error("Request logging registration failed"))

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await expect(createServer(config)).rejects.toThrow("Request logging registration failed")
    })

    it("should handle swagger registration errors", async () => {
      mockFastifyInstance.register.mockRejectedValue(new Error("Swagger registration failed"))

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
        enableSwagger: true,
      }

      await expect(createServer(config)).rejects.toThrow("Swagger registration failed")
    })

    it("should handle invalid serializer compiler configurations", async () => {
      mockSerializerCompiler.mockImplementation(() => {
        throw new Error("Invalid Zod schema")
      })

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      const server = await createServer(config)

      // Get the serializer compiler function that was set
      expect(mockFastifyInstance.setSerializerCompiler).toHaveBeenCalled()
      const setSerializerCall = mockFastifyInstance.setSerializerCompiler.mock.calls[0]?.[0]

      if (setSerializerCall) {
        // Test the fallback serializer when Zod schema compilation fails
        const result = setSerializerCall({
          schema: { type: "object" }, // Non-Zod schema
          method: "GET",
          url: "/test",
        })

        const testData = { test: "data" }
        const serializedData = result(testData)
        expect(serializedData).toBe(JSON.stringify(testData))
      }

      expect(server).toBe(mockFastifyInstance)
    })

    it("should handle withTypeProvider errors", async () => {
      mockFastifyInstance.withTypeProvider.mockImplementation(() => {
        throw new Error("withTypeProvider failed")
      })

      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
      }

      await expect(createServer(config)).rejects.toThrow("withTypeProvider failed")
    })

    it("should handle malformed config objects", async () => {
      const configs = [
        null as any,
        undefined as any,
        {} as any, // Missing required fields
        { name: "" } as any, // Empty name
        { name: "test", version: "" } as any, // Empty version
        { name: "test", version: "1.0.0" } as any, // Missing port
        { name: "test", version: "1.0.0", port: "invalid" } as any, // Invalid port type
      ]

      const promises = configs.map(async (config) => {
        if (config?.name && config?.version && typeof config?.port === "number") {
          // This config is actually valid
          return expect(createServer(config)).resolves.toBeDefined()
        } else {
          // These configs are invalid and should cause errors
          return expect(createServer(config)).rejects.toThrow()
        }
      })

      await Promise.all(promises)
    })

    it("should handle extreme config values", async () => {
      const config = {
        name: "a".repeat(1000), // Very long name
        version: "v".repeat(100), // Very long version
        port: 65535, // Maximum port
        enableSwagger: true,
        logger: {
          level: "trace" as const,
          pretty: true,
        },
      }

      // Should still work with extreme but valid values
      const server = await createServer(config)
      expect(server).toBe(mockFastifyInstance)
    })

    it("should handle concurrent server creation", async () => {
      const config = {
        name: "concurrent-server",
        version: "1.0.0",
        port: 3000,
      }

      // Create multiple servers concurrently
      const promises = Array.from({ length: 5 }, () => createServer(config))

      const servers = await Promise.all(promises)

      servers.forEach((server) => {
        expect(server).toBe(mockFastifyInstance)
      })
    })

    it("should handle memory pressure during server creation", async () => {
      const config = {
        name: "memory-test-server",
        version: "1.0.0",
        port: 3000,
      }

      // Create many servers to test memory handling
      const servers = await Promise.all(Array.from({ length: 20 }, () => createServer(config)))

      expect(servers).toHaveLength(20)
      servers.forEach((server) => {
        expect(server).toBe(mockFastifyInstance)
      })
    })

    it("should handle undefined logger config gracefully", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
        logger: undefined,
      }

      await createServer(config)

      expect(mockCreateFastifyLogger).toHaveBeenCalledWith({
        appName: "test-server",
      })
    })

    it("should handle partial logger config", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        port: 3000,
        logger: {
          level: undefined as any,
          pretty: undefined as any,
        },
      }

      await createServer(config)

      expect(mockCreateFastifyLogger).toHaveBeenCalledWith({
        appName: "test-server",
        level: undefined,
        pretty: undefined,
      })
    })

    it("should handle edge case port values", async () => {
      const portConfigs = [0, 1, 8080, 65535]

      const results = await Promise.all(
        portConfigs.map(async (port) => {
          const config = {
            name: `test-server-${port}`,
            version: "1.0.0",
            port,
            enableSwagger: true,
          }

          const server = await createServer(config)
          return { server, port }
        }),
      )

      results.forEach(({ server, port }) => {
        expect(server).toBe(mockFastifyInstance)

        // Verify swagger URLs are correctly configured
        const swaggerCalls = mockFastifyInstance.register.mock.calls.filter((call) => call[1]?.openapi)

        if (swaggerCalls.length > 0) {
          const lastSwaggerCall = swaggerCalls[swaggerCalls.length - 1]
          const openapi = lastSwaggerCall?.[1]?.openapi
          expect(openapi?.servers?.[0]?.url).toBe(`http://localhost:${port}`)
          expect(openapi?.servers?.[1]?.url).toBe(`http://0.0.0.0:${port}`)
        }
      })
    })
  })
})
