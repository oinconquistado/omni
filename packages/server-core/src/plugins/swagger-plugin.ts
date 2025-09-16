import type { FastifyInstance } from "../types/fastify-types"

export interface SwaggerConfig {
  name: string
  version: string
  port: number
  enableUi?: boolean
  routePrefix?: string
}

export async function registerSwagger(fastify: FastifyInstance, config: SwaggerConfig): Promise<void> {
  await fastify.register(import("@fastify/swagger"), {
    openapi: {
      info: {
        title: `${config.name} API`,
        description: `API documentation for ${config.name}`,
        version: config.version,
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: "Local development server",
        },
        {
          url: `http://0.0.0.0:${config.port}`,
          description: "Network development server",
        },
      ],
    },
  })

  if (config.enableUi !== false) {
    await fastify.register(import("@fastify/swagger-ui"), {
      routePrefix: config.routePrefix || "/docs",
      uiConfig: {
        docExpansion: "full",
        deepLinking: false,
      },
    })
  }
}
