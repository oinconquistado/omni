import { checkDatabaseHealth } from "../database/prisma-utils"
import { createFastifyLogger } from "../logger/logger-config"
import { registerRequestLogging } from "../middleware/request-logging"
import { createResponseOrchestrator } from "../middleware/response-orchestrator"
import { registerSwagger } from "../plugins/swagger-plugin"
import { registerApiRoutes } from "../routes/api-routes"
import { registerHealthRoutes } from "../routes/health-routes"
import { registerSentryDebugRoute, registerSentryErrorHandler } from "../sentry/fastify-sentry"
import { initializeSentry } from "../sentry/sentry-config"
import type { ServerInstance, UnifiedServerConfig } from "../types/server-config"

export async function configureServer(config: UnifiedServerConfig): Promise<ServerInstance> {
  // Initialize Sentry first if configured
  if (config.sentry) {
    initializeSentry(config.sentry)
  }

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

  // Configure request logging
  if (config.enableRequestLogging !== false) {
    await registerRequestLogging(fastify)
  }

  // Configure response orchestrator
  if (config.responseOrchestrator) {
    const orchestrator = createResponseOrchestrator(config.responseOrchestrator)
    fastify.decorate("responseOrchestrator", orchestrator)
  }

  // Configure Swagger
  if (config.swagger) {
    const swaggerConfig =
      typeof config.swagger === "boolean"
        ? {
            name: config.name,
            version: config.version,
            port: config.port,
            description: config.description,
          }
        : config.swagger

    await registerSwagger(fastify, swaggerConfig)
  }

  // Configure health routes
  if (config.health?.enabled !== false) {
    const healthConfig: any = {}

    if (config.database?.healthCheck) {
      healthConfig.checkDatabase = config.database.healthCheck
    } else if (config.database?.client) {
      healthConfig.checkDatabase = () => checkDatabaseHealth(config.database?.client)
    }

    if (config.health?.customChecks) {
      Object.assign(healthConfig, config.health.customChecks)
    }

    await registerHealthRoutes(fastify, healthConfig)
  }

  // Configure API routes
  if (config.api) {
    await registerApiRoutes(fastify, config.api)
  }

  // Configure Sentry error handling
  if (config.sentry) {
    await registerSentryErrorHandler(fastify)

    if (config.enableSentryDebugRoute) {
      await registerSentryDebugRoute(fastify)
    }
  }

  return {
    instance: fastify,
    start: async (): Promise<void> => {
      try {
        const host = config.host || "0.0.0.0"

        await fastify.listen({ port: config.port, host })

        console.log(`🚀 ${config.name} running on http://localhost:${config.port}`)
        console.log(`🌐 ${config.name} accessible on network at http://0.0.0.0:${config.port}`)

        if (config.swagger) {
          console.log(`📚 Swagger docs available at http://localhost:${config.port}/docs`)
        }
      } catch (err) {
        fastify.log.error(err)
        process.exit(1)
      }
    },
    stop: async (): Promise<void> => {
      await fastify.close()
    },
  }
}

export async function startServer(config: UnifiedServerConfig): Promise<ServerInstance> {
  const server = await configureServer(config)
  await server.start()
  return server
}
