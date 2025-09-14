import type { ApiResponse } from "@repo/shared-types"
import type { FastifyInstance } from "fastify"

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
    async (): Promise<ApiResponse<HealthData>> => {
      return {
        success: true,
        data: {
          status: "healthy",
          timestamp: Date.now(),
        },
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
          response: {
            200: {
              description: "Database health status",
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    timestamp: { type: "number" },
                    database: {
                      type: "object",
                      properties: {
                        connected: { type: "boolean" },
                        latency: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
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
        }
      },
    )
  }
}
