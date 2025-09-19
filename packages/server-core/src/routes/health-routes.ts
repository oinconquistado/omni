import type { ApiResponse } from "@repo/shared-types-and-schemas"
import type { FastifyInstance } from "../types/fastify-types"

export interface HealthData {
  status: string
  timestamp: number
}

export interface DatabaseHealthData extends HealthData {
  database: {
    connected: boolean
    latency?: number
  }
}

export async function registerHealthRoutes(
  fastify: FastifyInstance,
  options?: {
    checkDatabase?: () => Promise<{ connected: boolean; latency?: number }>
  },
): Promise<void> {
  fastify.get(
    "/health",
    {
      schema: {
        description: "Health check endpoint",
        tags: ["Health"],
      },
    },
    async (): Promise<ApiResponse<HealthData>> => {
      return {
        success: true,
        data: {
          status: "healthy",
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      }
    },
  )

  if (options?.checkDatabase) {
    fastify.get(
      "/health/database",
      {
        schema: {
          description: "Database health check endpoint",
          tags: ["Health"],
        },
      },
      async (): Promise<ApiResponse<DatabaseHealthData>> => {
        if (!options?.checkDatabase) {
          throw new Error("Database health check function not provided")
        }

        const database = await options.checkDatabase()
        return {
          success: true,
          data: {
            status: database.connected ? "healthy" : "unhealthy",
            timestamp: Date.now(),
            database,
          },
          timestamp: Date.now(),
        }
      },
    )
  }
}
