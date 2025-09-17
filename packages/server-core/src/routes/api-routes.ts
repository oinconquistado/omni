import type { ApiResponse } from "@repo/shared-types"
import type { FastifyInstance } from "../types/fastify-types"

export interface ApiInfo {
  message: string
  version: string
}

export async function registerApiRoutes(
  fastify: FastifyInstance,
  config: { name: string; version: string },
): Promise<void> {
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
    async (): Promise<ApiResponse<ApiInfo>> => {
      return {
        success: true,
        data: {
          message: config.name,
          version: config.version,
        },
        timestamp: Date.now(),
      }
    },
  )
}
