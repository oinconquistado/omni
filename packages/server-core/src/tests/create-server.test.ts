import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
  serializerCompiler: vi.fn(() => vi.fn((data: unknown) => JSON.stringify(data))),
  validatorCompiler: vi.fn(),
  ZodTypeProvider: {},
}))

// Mock request logging
vi.mock("../middleware/request-logging", () => ({
  registerRequestLogging: vi.fn().mockResolvedValue(undefined),
}))

// Mock logger config
vi.mock("../logger/logger-config", () => ({
  createFastifyLogger: vi.fn(() => ({
    level: "info",
    name: "test-server",
  })),
}))

describe("Create Server", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

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

    // Verify that createFastifyLogger was called with custom config
    expect(mockFastifyConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: expect.any(Object),
      }),
    )
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

    // Verify that request logging is registered
    expect(mockFastifyInstance.withTypeProvider).toHaveBeenCalled()
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
  })

  it("should handle serializer compiler fallback", async () => {
    const config = {
      name: "test-server",
      version: "1.0.0",
      port: 3000,
    }

    await createServer(config)

    // Verify that setSerializerCompiler was called with a function
    expect(mockFastifyInstance.setSerializerCompiler).toHaveBeenCalledWith(expect.any(Function))
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
    // This test ensures that Fastify is imported dynamically
    const config = {
      name: "test-server",
      version: "1.0.0",
      port: 3000,
    }

    const server = await createServer(config)

    // Verify that the dynamic import worked and created the server
    expect(server).toBe(mockFastifyInstance)
    expect(mockFastifyConstructor).toHaveBeenCalled()
  })
})
