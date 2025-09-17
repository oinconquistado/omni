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
import { findAvailablePort, killProcessOnPort } from "../utils/port-utils"

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
    const baseConfig = {
      name: config.name,
      version: config.version,
      port: config.port,
      description: config.description,
    }

    const swaggerConfig = typeof config.swagger === "boolean" ? baseConfig : { ...baseConfig, ...config.swagger }

    await registerSwagger(fastify, swaggerConfig)
  }

  // Configure health routes
  if (config.health !== false) {
    const healthConfig: any = {}

    if (config.database?.healthCheck) {
      healthConfig.checkDatabase = config.database.healthCheck
    } else if (config.database?.client) {
      healthConfig.checkDatabase = () => checkDatabaseHealth(config.database?.client)
    }

    if (typeof config.health === "object" && config.health.customChecks) {
      Object.assign(healthConfig, config.health.customChecks)
    }

    await registerHealthRoutes(fastify, healthConfig)
  }

  // Configure API routes
  if (config.api) {
    const baseApiConfig = {
      name: config.name,
      version: config.version,
    }

    const apiConfig = typeof config.api === "boolean" ? baseApiConfig : { ...baseApiConfig, ...config.api }

    await registerApiRoutes(fastify, apiConfig)
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
      const host = config.host || "0.0.0.0"
      let finalPort = config.port

      try {
        await fastify.listen({ port: finalPort, host })
      } catch (err: any) {
        if (err.code === "EADDRINUSE" && config.autoPortFallback !== false) {
          console.log(`⚠️  Port ${finalPort} is busy, trying to resolve...`)

          // Try to kill existing process
          const killed = await killProcessOnPort(finalPort)
          if (killed) {
            try {
              await fastify.listen({ port: finalPort, host })
              console.log(`✅ Successfully reclaimed port ${finalPort}`)
            } catch {
              // Still couldn't use the port, find another one
              finalPort = await findAvailablePort(finalPort + 1, config.maxPortRetries || 10)
              await fastify.listen({ port: finalPort, host })
              console.log(`🔄 Using alternative port ${finalPort}`)
            }
          } else {
            // Find alternative port
            finalPort = await findAvailablePort(finalPort + 1, config.maxPortRetries || 10)
            await fastify.listen({ port: finalPort, host })
            console.log(`🔄 Using alternative port ${finalPort}`)
          }
        } else {
          fastify.log.error(err)
          throw err
        }
      }

      console.log(`🚀 ${config.name} running on http://localhost:${finalPort}`)
      console.log(`🌐 ${config.name} accessible on network at http://0.0.0.0:${finalPort}`)

      if (config.swagger) {
        console.log(`📚 Swagger docs available at http://localhost:${finalPort}/docs`)
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
