import { readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { createAuthorizationMiddleware } from "../middleware/authorization"
import { responseOrchestrator } from "../middleware/response-orchestrator"
import { createValidationMiddleware } from "../middleware/validation"
import type {
  ControllerContext,
  ControllerHandler,
  DeclarativeFrameworkOptions,
  ModuleConfig,
  RouteConfig,
} from "../types/declarative-routes"
import type { FastifyInstance } from "../types/fastify-types"

// Regex patterns for path replacement
const ROUTES_TO_CONTROLLERS_UNIX = /\/routes$/
const ROUTES_TO_CONTROLLERS_WINDOWS = /\\routes$/

export class DeclarativeRouteRegistrar {
  constructor(
    private fastify: FastifyInstance,
    private options: DeclarativeFrameworkOptions,
  ) {}

  async registerDeclarativeRoutes(): Promise<void> {
    const modules = await this.discoverModules()

    const moduleResults = await Promise.all(
      modules.map(({ moduleName, config }) => this.registerModule(moduleName, config)),
    )

    const totalRoutes = moduleResults.reduce((sum, count) => sum + count, 0)
    this.fastify.log.info(`✅ Registered ${totalRoutes} declarative routes`)
  }

  private async discoverModules(): Promise<Array<{ moduleName: string; config: ModuleConfig }>> {
    const modules: Array<{ moduleName: string; config: ModuleConfig }> = []

    try {
      const routesDir = this.options.routesPath
      if (process.env.DEBUG) {
        this.fastify.log.debug(`🔍 Discovering modules in: ${routesDir}`)
      }

      const entries = readdirSync(routesDir, { withFileTypes: true })

      const directoryEntries = entries.filter((entry) => entry.isDirectory())

      const modulePromises = directoryEntries.map(async (entry) => {
        const modulePath = join(routesDir, entry.name)

        // Try to load config from .js or .ts
        const tryLoadConfig = async (extension: string) => {
          const configPath = join(modulePath, `config${extension}`)
          try {
            const configModule = await import(configPath)

            // Check for default export or named config export
            const config = configModule.default || configModule.config

            if (config?.routes) {
              return { moduleName: entry.name, config }
            }

            return null
          } catch {
            return null
          }
        }

        // Try .js first (compiled), then .ts (development)
        const jsResult = await tryLoadConfig(".js")
        if (jsResult) return jsResult

        const tsResult = await tryLoadConfig(".ts")
        if (tsResult) return tsResult

        this.fastify.log.warn(`No config found for module ${entry.name}`)
        return null
      })

      const moduleResults = await Promise.all(modulePromises)
      modules.push(...(moduleResults.filter(Boolean) as Array<{ moduleName: string; config: ModuleConfig }>))
    } catch (error) {
      this.fastify.log.warn(`Routes directory not found: ${this.options.routesPath} - ${(error as Error).message}`)
    }

    return modules
  }

  private async registerModule(moduleName: string, config: ModuleConfig): Promise<number> {
    const routeEntries = Object.entries(config.routes)

    const routePromises = routeEntries.map(async ([routeName, routeConfig]) => {
      try {
        await this.registerRoute(moduleName, routeName, routeConfig)
        return 1 as number
      } catch (error) {
        this.fastify.log.error(`Failed to register route ${moduleName}/${routeName}: ${error}`)
        return 0 as number
      }
    })

    const results = await Promise.all(routePromises)
    return results.reduce((sum, count) => sum + count, 0)
  }

  private async registerRoute(moduleName: string, routeName: string, config: RouteConfig): Promise<void> {
    // Load controller - use controllersPath or replace 'routes' with 'controllers' in routesPath
    const controllersBasePath =
      this.options.controllersPath ||
      this.options.routesPath
        .replace(ROUTES_TO_CONTROLLERS_UNIX, "/controllers")
        .replace(ROUTES_TO_CONTROLLERS_WINDOWS, "\\controllers")

    // Try to load controller from .js or .ts
    const tryLoadController = async (extension: string) => {
      const controllerPath = join(controllersBasePath, moduleName, `${config.controller}${extension}`)
      try {
        const controllerModule = await import(resolve(controllerPath))
        const handler: ControllerHandler = controllerModule.handle || controllerModule.default
        return { handler, controllerPath }
      } catch {
        return null
      }
    }

    // Try .js first (compiled), then .ts (development)
    const jsController = await tryLoadController(".js")
    const tsController = jsController || (await tryLoadController(".ts"))

    if (!tsController?.handler) {
      const attemptedPaths = [
        join(controllersBasePath, moduleName, `${config.controller}.js`),
        join(controllersBasePath, moduleName, `${config.controller}.ts`),
      ]
      throw new Error(`No handler found. Tried: ${attemptedPaths.join(", ")}`)
    }

    const { handler } = tsController

    // Build route path
    const routePath = `/${moduleName}/${routeName}`

    // Create middleware chain
    const preHandlers = []

    // Add validation middleware
    if (config.validation) {
      preHandlers.push(createValidationMiddleware({ schemas: config.validation }))
    }

    // Add authorization middleware
    if (config.authorization) {
      preHandlers.push(createAuthorizationMiddleware(config.authorization))
    }

    // Register the route
    this.fastify.route({
      method: config.method,
      url: routePath,
      preHandler: preHandlers.length > 0 ? preHandlers : undefined,
      handler: async (request, reply) => {
        try {
          // Create controller context
          const context: ControllerContext = {
            db: this.options.database.client,
            log: request.log,
            user: request.user,
          }

          // Extract input data
          const input = this.extractInputData(request, config.method)

          // Call controller
          const result = await handler(input, context)

          // Use response orchestrator
          if (config.paginated) {
            const paginatedResult = result as {
              data: unknown
              meta: import("@repo/shared-types-and-schemas").PaginationMeta
            }
            responseOrchestrator.success(reply, request, {
              data: paginatedResult.data || result,
              meta: paginatedResult.meta,
            })
          } else {
            responseOrchestrator.success(reply, request, { data: result })
          }
        } catch (error) {
          request.log.error(error)
          responseOrchestrator.error(reply, request, {
            code: "CONTROLLER_ERROR",
            message: error instanceof Error ? error.message : "Internal server error",
            statusCode: 500,
          })
        }
      },
    })

    this.fastify.log.info(`📍 ${config.method} ${routePath} -> ${moduleName}/${config.controller}`)
  }

  private extractInputData(
    request: import("../types/fastify-types").FastifyRequest,
    method: string,
  ): Record<string, unknown> {
    const params = (request.params || {}) as Record<string, unknown>
    const query = (request.query || {}) as Record<string, unknown>
    const body = (request.body || {}) as Record<string, unknown>

    const base = { ...params, ...query }
    return method === "GET" || method === "DELETE" ? base : { ...base, ...body }
  }
}

export async function registerDeclarativeRoutes(
  fastify: FastifyInstance,
  options: DeclarativeFrameworkOptions,
): Promise<void> {
  const registrar = new DeclarativeRouteRegistrar(fastify, options)
  await registrar.registerDeclarativeRoutes()
}
