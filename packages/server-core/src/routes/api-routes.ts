import type { ApiResponse } from "@repo/shared-types-and-schemas"
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
