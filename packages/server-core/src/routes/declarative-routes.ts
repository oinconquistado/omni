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

  private get logger() {
    return this.fastify.log
  }

  async registerDeclarativeRoutes(): Promise<void> {
    const modules = await this.discoverModules()

    const moduleResults = await Promise.all(
      modules.map(({ moduleName, config }) => this.registerModule(moduleName, config)),
    )

    const totalRoutes = moduleResults.reduce((sum, count) => sum + count, 0)
    this.logger.info({ totalRoutes }, "Declarative routes registered successfully")
  }

  private async discoverModules(): Promise<Array<{ moduleName: string; config: ModuleConfig }>> {
    const modules: Array<{ moduleName: string; config: ModuleConfig }> = []

    try {
      const routesDir = this.options.routesPath
      this.logger.debug({ routesPath: routesDir }, "Starting module discovery")

      const entries = readdirSync(routesDir, { withFileTypes: true })
      const directoryEntries = entries.filter((entry) => entry.isDirectory())

      this.logger.debug({ moduleDirectories: directoryEntries.map((e) => e.name) }, "Found module directories")

      const modulePromises = directoryEntries.map(async (entry) => {
        const modulePath = join(routesDir, entry.name)
        // Try to load config from .js or .ts
        const tryLoadConfig = async (extension: string) => {
          const configPath = join(modulePath, `config${extension}`)
          try {
            // Add cache busting for development
            const cacheBuster = `?t=${Date.now()}`
            const configModule = await import(resolve(configPath) + cacheBuster)

            // Access the actual values, not just the getters
            const defaultConfig = configModule.default?.config || configModule.default
            const namedConfig = configModule.config

            const config: ModuleConfig = defaultConfig || namedConfig

            if (config?.routes) {
              this.logger.debug(
                { moduleName: entry.name, routeCount: Object.keys(config.routes).length },
                "Module config loaded successfully",
              )
              return { moduleName: entry.name, config }
            }

            this.logger.debug({ moduleName: entry.name }, "Module config found but no routes defined")
            return null
          } catch (_error) {
            return null
          }
        }

        // Try .js first (compiled), then .ts (development)
        const jsResult = await tryLoadConfig(".js")
        if (jsResult) return jsResult

        const tsResult = await tryLoadConfig(".ts")
        if (tsResult) return tsResult

        return null
      })

      const moduleResults = await Promise.all(modulePromises)
      modules.push(...(moduleResults.filter(Boolean) as Array<{ moduleName: string; config: ModuleConfig }>))
    } catch (error) {
      this.logger.warn(
        { routesPath: this.options.routesPath, error: (error as Error).message },
        "Routes directory not found",
      )
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
        console.error(`Failed to register route ${moduleName}/${routeName}:`, error)
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
            db: (this.options.database as any).client || this.options.database,
            log: request.log,
            user: (request as any).user,
          }

          // Extract input data
          const input = this.extractInputData(request, config.method)

          // Call controller
          const result = await handler(input, context)

          // Use response orchestrator
          if (config.paginated) {
            responseOrchestrator.success(reply, request, {
              data: result.data || result,
              meta: result.meta,
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

    this.logger.debug(
      { method: config.method, path: routePath, controller: `${moduleName}/${config.controller}` },
      "Route registered",
    )
  }

  private extractInputData(request: any, method: string): any {
    const base = { ...request.params, ...request.query }
    return method === "GET" || method === "DELETE" ? base : { ...base, ...request.body }
  }
}

export async function registerDeclarativeRoutes(
  fastify: FastifyInstance,
  options: DeclarativeFrameworkOptions,
): Promise<void> {
  const registrar = new DeclarativeRouteRegistrar(fastify, options)
  await registrar.registerDeclarativeRoutes()
}
