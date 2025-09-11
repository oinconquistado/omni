import type { ApiResponse } from "@repo/shared-types"
import Fastify from "fastify"
import { env } from "./config/env.js"
import { dbManager } from "./services/database-clients.js"
import { companyService } from "./services/company-service.js"
import { redisClient } from "./services/redis-client.js"
import { createErrorResponse, ValidationError } from "./utils/error-handler.js"

const fastify = Fastify({
  logger: env.NODE_ENV === "development",
})

// Register Swagger
await fastify.register(import("@fastify/swagger"), {
  openapi: {
    info: {
      title: "Omni Server API",
      description: "API documentation for Omni Server",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            error: { type: "string" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Session: {
          type: "object",
          properties: {
            id: { type: "string" },
            token: { type: "string" },
            userId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
})

await fastify.register(import("@fastify/swagger-ui"), {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
})

// Health check endpoint
fastify.get(
  "/health",
  {
    schema: {
      description: "Health check endpoint with database status",
      tags: ["Health"],
      response: {
        200: {
          description: "Server health status",
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                status: { type: "string" },
                timestamp: { type: "number" },
                databases: {
                  type: "object",
                  properties: {
                    company: { type: "boolean" },
                    shared: { type: "boolean" },
                  },
                },
                cache: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  },
  async (): Promise<
    ApiResponse<{
      status: string
      timestamp: number
      databases: { company: boolean; shared: boolean }
      cache: boolean
    }>
  > => {
    const dbHealth = await dbManager.healthCheck()
    let cacheHealthy = false

    try {
      await redisClient.getClient().ping()
      cacheHealthy = true
    } catch {
      cacheHealthy = false
    }

    const allHealthy = dbHealth.company && dbHealth.shared && cacheHealthy

    return {
      success: true,
      data: {
        status: allHealthy ? "healthy" : "degraded",
        timestamp: Date.now(),
        databases: {
          company: dbHealth.company,
          shared: dbHealth.shared,
        },
        cache: cacheHealthy,
      },
    }
  },
)

// Root endpoint
fastify.get(
  "/",
  {
    schema: {
      description: "API root endpoint",
      tags: ["General"],
      response: {
        200: {
          description: "API information",
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                message: { type: "string" },
                version: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  async (): Promise<ApiResponse<{ message: string; version: string }>> => {
    return {
      success: true,
      data: {
        message: "Omni Server API",
        version: "1.0.0",
      },
    }
  },
)

// User routes
fastify.get(
  "/users/:id",
  {
    schema: {
      description: "Get user by ID",
      tags: ["Users"],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "User ID" },
        },
        required: ["id"],
      },
      response: {
        200: {
          description: "User data",
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "#/components/schemas/User" },
            error: { type: "string" },
          },
        },
      },
    },
  },
  async (request): Promise<ApiResponse> => {
    try {
      const { id } = request.params as { id: string }

      if (!id) {
        throw new ValidationError("User ID is required", "id")
      }

      const user = await companyService.getUserById(id)

      if (!user) {
        return {
          success: false,
          error: "User not found",
        }
      }

      return {
        success: true,
        data: user,
      }
    } catch (error) {
      return createErrorResponse(error as Error)
    }
  },
)

fastify.get("/users/email/:email", async (request): Promise<ApiResponse> => {
  try {
    const { email } = request.params as { email: string }

    if (!email) {
      throw new ValidationError("Email is required", "email")
    }

    const user = await companyService.getUserByEmail(email)

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    return {
      success: true,
      data: user,
    }
  } catch (error) {
    return createErrorResponse(error as Error)
  }
})

fastify.post("/users", async (request): Promise<ApiResponse> => {
  try {
    const { email, name } = request.body as { email: string; name?: string }

    if (!email) {
      throw new ValidationError("Email is required", "email")
    }

    const user = await companyService.createUser({ email, name: name || "" })

    if (!user) {
      return {
        success: false,
        error: "Failed to create user",
      }
    }

    return {
      success: true,
      data: user,
    }
  } catch (error) {
    return createErrorResponse(error as Error)
  }
})

// Session routes
fastify.get("/sessions/:token", async (request): Promise<ApiResponse> => {
  try {
    const { token } = request.params as { token: string }

    if (!token) {
      throw new ValidationError("Token is required", "token")
    }

    const session = await companyService.getSessionByToken(token)

    if (!session) {
      return {
        success: false,
        error: "Session not found",
      }
    }

    return {
      success: true,
      data: session,
    }
  } catch (error) {
    return createErrorResponse(error as Error)
  }
})

// Cache management routes
fastify.delete("/cache", async (): Promise<ApiResponse> => {
  try {
    const flushed = await redisClient.flush()

    return {
      success: flushed,
      data: { message: flushed ? "Cache cleared successfully" : "Failed to clear cache" },
    }
  } catch (error) {
    return createErrorResponse(error as Error)
  }
})

const start = async () => {
  try {
    // Connect to databases
    await dbManager.connect()

    // Test Redis connection
    await redisClient.getClient().ping()
    console.log("✅ Connected to Redis")

    // Start server
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" })
    console.log(`🚀 Server running on http://localhost:${env.PORT}`)
    console.log(`📚 API Documentation: http://localhost:${env.PORT}/docs`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`)

  try {
    await fastify.close()
    await redisClient.disconnect()
    await dbManager.disconnect()
    console.log("✅ Server shut down complete")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error during shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))

start()
