import { createPrismaClientFromSchema } from "../database/prisma-factory"
import { checkDatabaseHealth } from "../database/prisma-utils"
import { createFastifyLogger, createLogger } from "../logger/logger-config"
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

  // Auto-enable health checks if database is available OR if health config is provided
  if (!autoConfig.health && config.health !== null && (config.database?.client || config.health)) {
    autoConfig.health = {}
  }

  return autoConfig
}

function logDisabledFeatures(config: UnifiedServerConfig, logger: import("pino").Logger): void {
  if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
    const disabled: string[] = []

    if (!config.api) disabled.push("API routes")
    if (!config.autoRoutes) disabled.push("Auto route discovery")
    if (!config.swagger) disabled.push("Swagger documentation")
    if (!config.health) disabled.push("Health checks")
    if (!config.sentry) disabled.push("Sentry error tracking")
    if (!config.database) disabled.push("Database integration")

    if (disabled.length > 0) {
      if (process.env.DEBUG) {
        logger.debug(`🔧 Disabled features: ${disabled.join(", ")}`)
      }
    }
  }
}

export async function configureServer(config: UnifiedServerConfig): Promise<ServerInstance> {
  // Auto-detect environment variables and merge with config
  const enrichedConfig = enrichConfigWithEnvironment(config)

  // Create logger first
  const logger = createLogger({ appName: enrichedConfig.name, ...enrichedConfig.logger })

  // Auto-enable features based on available dependencies
  const finalConfig = autoEnableFeatures(enrichedConfig)

  let databaseConnectionInfo: { connected: boolean; latency?: number } | null = null

  // Auto-create Prisma client if schema is specified
  if (finalConfig.database?.schema && !finalConfig.database?.client) {
    finalConfig.database.client = createPrismaClientFromSchema(finalConfig.database.schema, logger)

    // Test database connection and store result for later logging
    try {
      databaseConnectionInfo = await checkDatabaseHealth(finalConfig.database.client, logger)
    } catch {
      databaseConnectionInfo = { connected: false }
    }
  }

  // Log disabled features in debug mode
  logDisabledFeatures(finalConfig, logger)

  // Initialize Sentry first if configured
  if (finalConfig.sentry) {
    initializeSentry(
      {
        ...finalConfig.sentry,
        appName: finalConfig.name,
      },
      logger,
    )
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
        const result = await checkDatabaseHealth(client, logger)
        return {
          status: result.connected ? "healthy" : "unhealthy",
          details: { latency: result.latency },
        }
      }
    }

    if ("checkDatabase" in finalConfig.health && finalConfig.health.checkDatabase) {
      healthConfig.checkDatabase = finalConfig.health.checkDatabase
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

    fastify.log.debug("🔄 Auto route discovery enabled")
    fastify.log.debug("")

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
        if (process.env.DEBUG) {
          fastify.log.debug(`🚀 Starting ${finalConfig.name} on port ${finalPort}`)
        }
        await fastify.listen({ port: finalPort, host })
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "EADDRINUSE" && finalConfig.autoPortFallback !== false) {
          fastify.log.warn(`⚠️  Port ${finalPort} is busy, trying to resolve...`)

          // Try to kill existing process
          const killed = await killProcessOnPort(finalPort, logger)
          if (killed) {
            try {
              await fastify.listen({ port: finalPort, host })
              fastify.log.info(`✅ Successfully reclaimed port ${finalPort}`)
            } catch {
              // Still couldn't use the port, find another one
              finalPort = await findAvailablePort(finalPort + 1, finalConfig.maxPortRetries || 10)
              await fastify.listen({ port: finalPort, host })
              fastify.log.info(`🔄 Using alternative port ${finalPort}`)
            }
          } else {
            // Find alternative port
            finalPort = await findAvailablePort(finalPort + 1, finalConfig.maxPortRetries || 10)
            await fastify.listen({ port: finalPort, host })
            fastify.log.info(`🔄 Using alternative port ${finalPort}`)
          }
        } else {
          fastify.log.error(err)
          throw err
        }
      }

      // Log server startup info with spacing
      fastify.log.info(`🚀 ${finalConfig.name} started successfully`)
      fastify.log.info("")

      fastify.log.info(`🌐 Server accessible at http://localhost:${finalPort}`)

      // Log database connection status
      if (databaseConnectionInfo) {
        if (databaseConnectionInfo.connected) {
          fastify.log.info(`💾 Database connected (${databaseConnectionInfo.latency}ms)`)
        } else {
          fastify.log.warn("💾 Database connection failed")
        }
      }

      fastify.log.info("")

      // Log additional endpoints
      if (finalConfig.swagger) {
        fastify.log.info(`📚 Swagger docs: http://localhost:${finalPort}/docs`)
      }
      if (finalConfig.health) {
        fastify.log.info(`🩺 Health check: http://localhost:${finalPort}/server-core/health`)
      }
      if (finalConfig.sentry && finalConfig.enableSentryDebugRoute) {
        fastify.log.debug(`🐛 Sentry debug: http://localhost:${finalPort}/server-core/debug-sentry`)
      }
    },
    stop: async (): Promise<void> => {
      fastify.log.info("🛑 Stopping server")
      await fastify.close()
    },
  }
}

export async function startServer(config: UnifiedServerConfig): Promise<ServerInstance> {
  const server = await configureServer(config)
  await server.start()
  return server
}
