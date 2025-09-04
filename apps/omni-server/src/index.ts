import type { ApiResponse } from "@repo/shared-types"
import Fastify from "fastify"
import { env } from "./config/env.js"
import { databaseService } from "./services/database-service.js"
import { prismaService } from "./services/prisma-client.js"
import { redisClient } from "./services/redis-client.js"
import { createErrorResponse, ValidationError } from "./utils/error-handler.js"

const fastify = Fastify({
  logger: env.NODE_ENV === "development",
})

// Health check endpoint
fastify.get("/health", async (): Promise<ApiResponse<{ status: string; timestamp: number }>> => {
  return {
    success: true,
    data: {
      status: "healthy",
      timestamp: Date.now(),
    },
  }
})

// Root endpoint
fastify.get("/", async (): Promise<ApiResponse<{ message: string; version: string }>> => {
  return {
    success: true,
    data: {
      message: "Omni Server API",
      version: "1.0.0",
    },
  }
})

// User routes
fastify.get("/users/:id", async (request): Promise<ApiResponse> => {
  try {
    const { id } = request.params as { id: string }

    if (!id) {
      throw new ValidationError("User ID is required", "id")
    }

    const user = await databaseService.getUserById(id)

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

fastify.get("/users/email/:email", async (request): Promise<ApiResponse> => {
  try {
    const { email } = request.params as { email: string }

    if (!email) {
      throw new ValidationError("Email is required", "email")
    }

    const user = await databaseService.getUserByEmail(email)

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

    const user = await databaseService.createUser({ email, name: name || null })

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

    const session = await databaseService.getSessionByToken(token)

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
    const flushed = await databaseService.flush()

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
    await prismaService.connect()
    console.log("✅ Connected to PostgreSQL")

    // Test Redis connection
    await redisClient.getClient().ping()
    console.log("✅ Connected to Redis")

    // Start server
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" })
    console.log(`🚀 Server running on http://localhost:${env.PORT}`)
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
    await prismaService.disconnect()
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
