import type { FastifyInstance } from "fastify"
import Fastify from "fastify"

export interface ServerConfig {
  name: string
  version: string
  port: number
  enableSwagger?: boolean
}

export async function createServer(config: ServerConfig): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
  })

  if (config.enableSwagger) {
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
  }

  return fastify
}
