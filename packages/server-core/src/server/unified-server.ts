import { createPrismaClientFromSchema } from "../database/prisma-factory"
import { checkDatabaseHealth } from "../database/prisma-utils"
import { createFastifyLogger } from "../logger/logger-config"
import { registerRequestLogging } from "../middleware/request-logging"
import { createResponseOrchestrator } from "../middleware/response-orchestrator"
import { registerSwagger } from "../plugins/swagger-plugin"
import { registerApiRoutes } from "../routes/api-routes"
import { AutoRouteDiscovery } from "../routes/auto-route-discovery"
import { registerHealthRoutes } from "../routes/health-routes"
import { registerSentryDebugRoute, registerSentryErrorHandler } from "../sentry/fastify-sentry"
import { initializeSentry } from "../sentry/sentry-config"
import type { FastifyInstance } from "../types/fastify-types"
import type { FastifyInstanceLike, ServerInstance, UnifiedServerConfig } from "../types/server-config"
import { findAvailablePort, killProcessOnPort } from "../utils/port-utils"

function enrichConfigWithEnvironment(config: UnifiedServerConfig): UnifiedServerConfig {
  return {
    ...config,
    // Auto-inject environment variables
    port: config.port || Number(process.env.PORT) || 3000,
    logger: config.logger || {
      level: process.env.LOG_LEVEL || "info",
      pretty: process.env.NODE_ENV !== "production",
    },
    autoPortFallback: config.autoPortFallback !== false,
    enableRequestLogging: config.enableRequestLogging !== false,
    // Auto-enable Sentry debug route in development
    enableSentryDebugRoute: config.enableSentryDebugRoute !== false && process.env.NODE_ENV === "development",
  }
}

function autoEnableFeatures(config: UnifiedServerConfig): UnifiedServerConfig {
  const autoConfig = { ...config }

  // Auto-enable API if not explicitly disabled
  if (!autoConfig.api && config.api !== null) {
    autoConfig.api = {}
  }

  // Auto-enable Auto Route Discovery if not explicitly disabled
  if (!autoConfig.autoRoutes && config.autoRoutes !== null) {
    autoConfig.autoRoutes = {}
  }

  // Auto-enable Swagger if not explicitly disabled
  if (!autoConfig.swagger && config.swagger !== null) {
    autoConfig.swagger = {}
  }

  // Auto-enable  Sentry
  if (!autoConfig.sentry && config.sentry !== null) {
    autoConfig.sentry = {}
  }

  // Auto-enable health checks if database is available
  if (!autoConfig.health && config.health !== null && config.database?.client) {
    autoConfig.health = {}
  }

  return autoConfig
}

function logDisabledFeatures(config: UnifiedServerConfig): void {
  if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
    const disabled: string[] = []

    if (!config.api) disabled.push("API routes")
    if (!config.autoRoutes) disabled.push("Auto route discovery")
    if (!config.swagger) disabled.push("Swagger documentation")
    if (!config.health) disabled.push("Health checks")
    if (!config.sentry) disabled.push("Sentry error tracking")
    if (!config.database) disabled.push("Database integration")

    if (disabled.length > 0) {
      console.log(`🔧 Debug: Disabled features: ${disabled.join(", ")}`)
    }
  }
}

export async function configureServer(config: UnifiedServerConfig): Promise<ServerInstance> {
  // Auto-detect environment variables and merge with config
  const enrichedConfig = enrichConfigWithEnvironment(config)

  // Auto-enable features based on available dependencies
  const finalConfig = autoEnableFeatures(enrichedConfig)

  // Auto-create Prisma client if schema is specified
  if (finalConfig.database?.schema && !finalConfig.database?.client) {
    finalConfig.database.client = createPrismaClientFromSchema(finalConfig.database.schema)
  }

  // Log disabled features in debug mode
  logDisabledFeatures(finalConfig)

  // Initialize Sentry first if configured
  if (finalConfig.sentry) {
    initializeSentry({
      ...finalConfig.sentry,
      appName: finalConfig.name,
    })
  }

  // Import Fastify dynamically to ensure Sentry is initialized first
  const { default: Fastify } = await import("fastify")

  const fastify = Fastify({
    logger: createFastifyLogger({
      appName: finalConfig.name,
      ...finalConfig.logger,
    }),
    requestIdLogLabel: "requestId",
    genReqId: () => {
      return Math.random().toString(36).substring(2, 15)
    },
  })

  // Configure request logging
  if (finalConfig.enableRequestLogging !== false) {
    await registerRequestLogging(fastify)
  }

  // Configure response orchestrator
  if (finalConfig.responseOrchestrator) {
    const orchestrator = createResponseOrchestrator(finalConfig.responseOrchestrator)
    fastify.decorate("responseOrchestrator", orchestrator)
  }

  // Configure Swagger
  if (finalConfig.swagger && (!("enabled" in finalConfig.swagger) || finalConfig.swagger.enabled !== false)) {
    const baseConfig = {
      name: finalConfig.name,
      version: finalConfig.version,
      port: finalConfig.port,
      description: finalConfig.description,
    }

    const swaggerConfig = { ...baseConfig, ...finalConfig.swagger }

    await registerSwagger(fastify, swaggerConfig)
  }

  // Configure health routes
  if (finalConfig.health && (!("enabled" in finalConfig.health) || finalConfig.health.enabled !== false)) {
    const healthConfig: Record<string, () => Promise<{ status: string; details?: Record<string, unknown> }>> = {}

    if (finalConfig.database?.healthCheck) {
      healthConfig.checkDatabase = finalConfig.database.healthCheck
    } else if (finalConfig.database?.client) {
      healthConfig.checkDatabase = async () => {
        const client = finalConfig.database?.client
        if (!client) {
          return { status: "unhealthy", details: { error: "No database client" } }
        }
        const result = await checkDatabaseHealth(client)
        return {
          status: result.connected ? "healthy" : "unhealthy",
          details: { latency: result.latency },
        }
      }
    }

    if ("customChecks" in finalConfig.health && finalConfig.health.customChecks) {
      Object.assign(healthConfig, finalConfig.health.customChecks)
    }

    await registerHealthRoutes(fastify, healthConfig)
  }

  // Configure API routes
  if (finalConfig.api && (!("enabled" in finalConfig.api) || finalConfig.api.enabled !== false)) {
    const baseApiConfig = {
      name: finalConfig.name,
      version: finalConfig.version,
    }

    const apiConfig = { ...baseApiConfig, ...finalConfig.api }

    await registerApiRoutes(fastify, apiConfig)
  }

  // Configure Auto Route Discovery
  if (finalConfig.autoRoutes && (!("enabled" in finalConfig.autoRoutes) || finalConfig.autoRoutes.enabled !== false)) {
    const autoRouteConfig = {
      apiPath: finalConfig.autoRoutes.apiPath || "./api",
      defaultMethod: finalConfig.autoRoutes.defaultMethod || "GET",
    }

    const autoRouteDiscovery = new AutoRouteDiscovery({
      ...autoRouteConfig,
      log: {
        debug: (data: unknown, message?: string) => fastify.log.debug(message || JSON.stringify(data)),
        info: (data: unknown, message?: string) => fastify.log.info(message || JSON.stringify(data)),
        warn: (data: unknown, message?: string) => fastify.log.warn(message || JSON.stringify(data)),
        error: (data: unknown, message?: string) => fastify.log.error(message || JSON.stringify(data)),
      },
      database: finalConfig.database?.client ? { client: finalConfig.database.client } : undefined,
    })

    await autoRouteDiscovery.registerRoutes(fastify as unknown as FastifyInstance)
  }

  // Configure Sentry error handling
  if (finalConfig.sentry) {
    await registerSentryErrorHandler(fastify)

    if (finalConfig.enableSentryDebugRoute) {
      await registerSentryDebugRoute(fastify)
    }
  }

  // Decorar a instância do Fastify com o database client para acesso fácil
  if (finalConfig.database?.client) {
    fastify.decorate("database", finalConfig.database.client)
  }

  return {
    instance: fastify as unknown as FastifyInstanceLike,
    start: async (): Promise<void> => {
      const host = finalConfig.host || "0.0.0.0"
      let finalPort = finalConfig.port

      try {
        await fastify.listen({ port: finalPort, host })
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "EADDRINUSE" && finalConfig.autoPortFallback !== false) {
          console.log(`⚠️  Port ${finalPort} is busy, trying to resolve...`)

          // Try to kill existing process
          const killed = await killProcessOnPort(finalPort)
          if (killed) {
            try {
              await fastify.listen({ port: finalPort, host })
              console.log(`✅ Successfully reclaimed port ${finalPort}`)
            } catch {
              // Still couldn't use the port, find another one
              finalPort = await findAvailablePort(finalPort + 1, finalConfig.maxPortRetries || 10)
              await fastify.listen({ port: finalPort, host })
              console.log(`🔄 Using alternative port ${finalPort}`)
            }
          } else {
            // Find alternative port
            finalPort = await findAvailablePort(finalPort + 1, finalConfig.maxPortRetries || 10)
            await fastify.listen({ port: finalPort, host })
            console.log(`🔄 Using alternative port ${finalPort}`)
          }
        } else {
          fastify.log.error(err)
          throw err
        }
      }

      console.log(`🚀 ${finalConfig.name} running on http://localhost:${finalPort}`)
      console.log(`🌐 ${finalConfig.name} accessible on network at http://0.0.0.0:${finalPort}`)

      if (finalConfig.swagger) {
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
