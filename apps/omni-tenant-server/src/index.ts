import type { ApiResponse } from "@repo/shared-types"
import Fastify from "fastify"

const fastify = Fastify({
  logger: true,
})

// Register Swagger
await fastify.register(import("@fastify/swagger"), {
  openapi: {
    info: {
      title: "Omni Tenant Server API",
      description: "API documentation for Omni Tenant Server",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3004",
        description: "Development server",
      },
    ],
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
      description: "Health check endpoint",
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
              },
            },
          },
        },
      },
    },
  },
  async (): Promise<ApiResponse<{ status: string; timestamp: number }>> => {
    return {
      success: true,
      data: {
        status: "healthy",
        timestamp: Date.now(),
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
        message: "Omni Tenant Server API",
        version: "1.0.0",
      },
    }
  },
)

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3004

    await fastify.listen({ port, host: "0.0.0.0" })
    console.log(`🚀 Tenant Server running on http://localhost:${port}`)
    console.log(`📚 API Documentation: http://localhost:${port}/docs`)
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
    console.log("✅ Tenant Server shut down complete")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error during shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))

start()
