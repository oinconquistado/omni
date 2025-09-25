import { responseOrchestrator } from "../middleware/response-orchestrator"
import { createValidationMiddleware } from "../middleware/validation"
import type { ControllerContext } from "../types/declarative-routes"
import type { FastifyInstance, FastifyRequest } from "../types/fastify-types"
import type { PrismaClientLike } from "../types/server-config"
import { ControllerDiscovery, type ControllerMetadata } from "./controller-discovery"
import { SchemaDiscovery, type SchemaMetadata } from "./schema-discovery"

export interface AutoDiscoveredRoute {
  path: string
  method: string
  controller: ControllerMetadata
  schemas: SchemaMetadata[]
  middlewares?: string[]
}

export interface AutoRouteDiscoveryOptions {
  apiPath: string
  defaultMethod?: string
  log?: {
    debug?: (data: unknown, message?: string) => void
    info?: (data: unknown, message?: string) => void
    warn?: (data: unknown, message?: string) => void
    error?: (data: unknown, message?: string) => void
  }
  database?: {
    client: PrismaClientLike
  }
}

export class AutoRouteDiscovery {
  private routes = new Map<string, AutoDiscoveredRoute>()
  private controllerDiscovery: ControllerDiscovery
  private schemaDiscovery: SchemaDiscovery

  constructor(private options: AutoRouteDiscoveryOptions) {
    this.controllerDiscovery = new ControllerDiscovery({
      apiPath: options.apiPath,
      log: options.log,
    })

    this.schemaDiscovery = new SchemaDiscovery({
      apiPath: options.apiPath,
      log: options.log,
    })
  }

  async discoverRoutes(): Promise<Map<string, AutoDiscoveredRoute>> {
    const log = this.options.log
    log?.debug?.({}, "Starting auto route discovery")

    try {
      // Discover controllers and schemas in parallel
      const [controllers, schemas] = await Promise.all([
        this.controllerDiscovery.discoverControllers(),
        this.schemaDiscovery.discoverSchemas(),
      ])

      // Match controllers with their schemas and build routes
      this.buildRoutes(controllers, schemas)

      log?.debug?.(
        {
          totalRoutes: this.routes.size,
          duplicateRoutes: this.controllerDiscovery.getDuplicateRoutes(),
        },
        "Auto route discovery completed",
      )

      return this.routes
    } catch (error) {
      log?.error?.({ error }, "Auto route discovery failed")
      throw error
    }
  }

  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    const log = this.options.log
    log?.debug?.({}, "Starting route registration")

    const routes = await this.discoverRoutes()
    let registeredRoutes = 0
    const registrationSummary: Array<{ method: string; path: string; basePath: string }> = []

    const registrationPromises = Array.from(routes.values()).map(async (route) => {
      try {
        await this.registerSingleRoute(fastify, route)
        registeredRoutes++

        const basePath = route.path.split("/")[1] || "root"
        registrationSummary.push({
          method: route.method,
          path: route.path,
          basePath,
        })
      } catch (error) {
        log?.error?.({ error, route: route.path }, "Failed to register route")
        throw error
      }
    })

    await Promise.all(registrationPromises)

    // Log simplified route summary
    log?.info?.({ count: registeredRoutes }, `Registered ${registeredRoutes}/${routes.size} routes`)

    // Add blank line for spacing
    console.log()
  }

  private buildRoutes(controllers: Map<string, ControllerMetadata>, schemas: Map<string, SchemaMetadata>): void {
    this.routes.clear()

    for (const [routePath, controller] of controllers) {
      // Find matching schemas for this controller
      const matchingSchemas = this.findMatchingSchemas(controller, schemas)

      // Determine HTTP method (could be enhanced with controller metadata)
      const method = this.inferHttpMethod(controller)

      // Check for middleware configuration (could be enhanced)
      const middlewares = this.extractMiddlewares(controller)

      const route: AutoDiscoveredRoute = {
        path: routePath,
        method,
        controller,
        schemas: matchingSchemas,
        middlewares,
      }

      this.routes.set(routePath, route)
    }
  }

  private findMatchingSchemas(
    controller: ControllerMetadata,
    allSchemas: Map<string, SchemaMetadata>,
  ): SchemaMetadata[] {
    const matchingSchemas: SchemaMetadata[] = []

    // Look for schemas that match this controller's module and name
    const possibleSchemaKeys = [
      `${controller.moduleName}/${controller.controllerName}`,
      `${controller.moduleName}/${controller.controllerName}-body`,
      `${controller.moduleName}/${controller.controllerName}-params`,
      `${controller.moduleName}/${controller.controllerName}-query`,
      `${controller.moduleName}/${controller.controllerName}-headers`,
    ]

    for (const key of possibleSchemaKeys) {
      const schema = allSchemas.get(key)
      if (schema) {
        matchingSchemas.push(schema)
      }
    }

    return matchingSchemas
  }

  private inferHttpMethod(controller: ControllerMetadata): string {
    // Infer HTTP method from controller name patterns
    const name = controller.controllerName.toLowerCase()

    if (name.startsWith("create") || name.startsWith("add")) {
      return "POST"
    }
    if (name.startsWith("update") || name.startsWith("edit")) {
      return "PUT"
    }
    if (name.startsWith("delete") || name.startsWith("remove")) {
      return "DELETE"
    }
    if (name.startsWith("get") || name.startsWith("list") || name.startsWith("find")) {
      return "GET"
    }

    // Default method
    return this.options.defaultMethod || "GET"
  }

  private extractMiddlewares(_controller: ControllerMetadata): string[] | undefined {
    // This could be enhanced to read middleware configuration from controller files
    // For now, return undefined - middleware can be added via manual configuration
    return undefined
  }

  private async registerSingleRoute(fastify: FastifyInstance, route: AutoDiscoveredRoute): Promise<void> {
    const log = this.options.log

    try {
      // Build validation middleware from schemas
      const preHandlers = []

      if (route.schemas.length > 0) {
        const validationSchemas: Record<string, unknown> = {}

        for (const schema of route.schemas) {
          validationSchemas[schema.validationType] = schema.schema
        }

        preHandlers.push(createValidationMiddleware({ schemas: validationSchemas }))
      }

      // Register the route
      fastify.route({
        method: route.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
        url: route.path,
        preHandler: preHandlers.length > 0 ? preHandlers : undefined,
        handler: async (request, reply) => {
          try {
            // Create controller context
            const context: ControllerContext = {
              db: this.options.database?.client,
              log: request.log,
              user: request.user,
            }

            // Extract input data based on HTTP method
            const input = this.extractInputData(request, route.method)

            // Call controller
            const result = await route.controller.handler(input, context)

            // Send response
            responseOrchestrator.success(reply, request, { data: result })
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

      log?.debug?.(
        {
          method: route.method,
          path: route.path,
          controller: route.controller.filePath,
          schemas: route.schemas.map((s) => s.filePath),
        },
        `Registered route: ${route.method} ${route.path}`,
      )
    } catch (error) {
      log?.error?.({ error, route }, "Failed to register route")
      throw error
    }
  }

  private extractInputData(request: FastifyRequest, method: string): Record<string, unknown> {
    const params = (request.params || {}) as Record<string, unknown>
    const query = (request.query || {}) as Record<string, unknown>
    const body = (request.body || {}) as Record<string, unknown>

    const base = { ...params, ...query }
    return method === "GET" || method === "DELETE" ? base : { ...base, ...body }
  }

  getRoute(path: string): AutoDiscoveredRoute | undefined {
    return this.routes.get(path)
  }

  getAllRoutes(): AutoDiscoveredRoute[] {
    return Array.from(this.routes.values())
  }
}
