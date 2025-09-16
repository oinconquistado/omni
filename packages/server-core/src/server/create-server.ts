import { createFastifyLogger, type LoggerConfig } from "../logger/logger-config"
import { registerRequestLogging } from "../middleware/request-logging"
import type { FastifyInstance } from "../types/fastify-types"

export interface ServerConfig {
  name: string
  version: string
  port: number
  enableSwagger?: boolean
  logger?: LoggerConfig
}

export async function createServer(config: ServerConfig): Promise<FastifyInstance> {
  // Import Fastify dynamically to ensure Sentry is initialized first
  const { default: Fastify } = await import("fastify")

  const fastify = Fastify({
    logger: createFastifyLogger({
      appName: config.name,
      ...config.logger,
    }),
    requestIdLogLabel: "requestId",
    genReqId: () => {
      return Math.random().toString(36).substring(2, 15)
    },
  })

  await registerRequestLogging(fastify)

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
