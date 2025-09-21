import { addManualRoute, addManualRoutes, ManualRouteRegistry } from "../routes/manual-routes-registry"
import type { FastifyInstance } from "../types/fastify-types"

/**
 * Example: Using global registry functions (recommended for most cases)
 */
export function exampleGlobalRegistryUsage() {
  // Add a single high-priority route
  addManualRoute({
    id: "auth-middleware",
    priority: 100,
    register: async (fastify: FastifyInstance) => {
      fastify.addHook("preValidation", async (request) => {
        // Authentication logic here
        console.log("Auth middleware for:", request.url)
      })
    },
  })

  // Add multiple routes at once
  addManualRoutes([
    {
      id: "user-routes",
      priority: 50,
      register: async (fastify: FastifyInstance) => {
        fastify.get("/api/users", async () => {
          return { users: [] }
        })

        fastify.post("/api/users", async (request) => {
          return { user: request.body }
        })
      },
    },
    {
      id: "health-check",
      priority: 10,
      register: async (fastify: FastifyInstance) => {
        fastify.get("/health", async () => {
          return { status: "healthy", timestamp: new Date().toISOString() }
        })
      },
    },
  ])

  // In your server setup, register all routes:
  // await registerAllManualRoutes(fastify)
}

/**
 * Example: Using local registry instance (for advanced use cases)
 */
export async function exampleLocalRegistryUsage(fastify: FastifyInstance) {
  // Create a local registry with custom configuration
  const registry = new ManualRouteRegistry({
    maxConcurrency: 2, // Limit concurrent route registrations
    enableProfiling: true, // Log timing information
  })

  // Add routes with different priorities
  registry.addRoutes([
    {
      id: "cors-middleware",
      priority: 200, // Highest priority - runs first
      register: async (fastify: FastifyInstance) => {
        // Simulate CORS plugin registration
        fastify.addHook("onRequest", async (_, reply) => {
          reply.header("Access-Control-Allow-Origin", "http://localhost:3000")
        })
      },
    },
    {
      id: "api-documentation",
      priority: 150,
      register: async (fastify: FastifyInstance) => {
        await fastify.register(import("@fastify/swagger"), {
          openapi: {
            info: { title: "API", version: "1.0.0" },
          },
        })
      },
    },
    {
      id: "business-logic",
      priority: 50,
      register: async (fastify: FastifyInstance) => {
        fastify.get("/api/products", async () => {
          return { products: [] }
        })
      },
    },
  ])

  // Register all routes with optimal concurrency
  await registry.registerAll(fastify)

  console.log(`Registered ${registry.getRouteCount()} routes`)
  console.log("Route execution order:", registry.getRouteIds())
}

/**
 * Example: Multiple module registration pattern
 */
export function exampleModularUsage() {
  // Module A registers its routes
  addManualRoute({
    id: "module-a-auth",
    priority: 100,
    register: async (fastify: FastifyInstance) => {
      fastify.register(
        async (fastify) => {
          fastify.addHook("preHandler", async (request) => {
            console.log("Module A auth for:", request.url)
          })
        },
        { prefix: "/module-a" },
      )
    },
  })

  // Module B registers its routes
  addManualRoute({
    id: "module-b-routes",
    priority: 80,
    register: async (fastify: FastifyInstance) => {
      fastify.register(
        async (fastify) => {
          fastify.get("/data", async () => ({ data: "Module B data" }))
          fastify.post("/process", async (request) => ({ processed: request.body }))
        },
        { prefix: "/module-b" },
      )
    },
  })

  // Module C registers background tasks
  addManualRoute({
    id: "module-c-background",
    priority: 10, // Lower priority - runs after main routes
    register: async (fastify: FastifyInstance) => {
      fastify.addHook("onReady", async () => {
        console.log("Module C background tasks initialized")
      })
    },
  })
}

/**
 * Example: Performance optimized registration
 */
export async function examplePerformanceOptimizedUsage(fastify: FastifyInstance) {
  const registry = new ManualRouteRegistry({
    maxConcurrency: 4, // Use multi-core processing
    enableProfiling: true,
  })

  // Add CPU-intensive route registrations
  const heavyRoutes = Array.from({ length: 10 }, (_, i) => ({
    id: `heavy-route-${i}`,
    priority: 50, // Same priority for parallel processing
    register: async (fastify: FastifyInstance) => {
      // Simulate heavy registration work
      await new Promise((resolve) => setTimeout(resolve, 100))

      fastify.get(`/heavy/${i}`, async () => {
        return { route: i, timestamp: Date.now() }
      })
    },
  }))

  registry.addRoutes(heavyRoutes)

  const startTime = performance.now()
  await registry.registerAll(fastify)
  const endTime = performance.now()

  console.log(`Registered ${registry.getRouteCount()} heavy routes in ${endTime - startTime}ms`)
}

/**
 * Example: Error handling and recovery
 */
export async function exampleErrorHandling(fastify: FastifyInstance) {
  const registry = new ManualRouteRegistry()

  registry.addRoutes([
    {
      id: "working-route",
      priority: 100,
      register: async (fastify: FastifyInstance) => {
        fastify.get("/working", async () => ({ status: "working" }))
      },
    },
    {
      id: "failing-route",
      priority: 90,
      register: async () => {
        throw new Error("Route registration failed")
      },
    },
  ])

  try {
    await registry.registerAll(fastify)
  } catch (error) {
    console.error("Route registration failed:", error)

    // Handle partial registration or retry logic
    const workingRoutes = registry
      .getRouteIds()
      .filter((id) => id !== "failing-route")
      .map((id) => ({
        id,
        priority: 50,
        register: async (fastify: FastifyInstance) => {
          fastify.get(`/${id}`, async () => ({ route: id }))
        },
      }))

    const recoveryRegistry = new ManualRouteRegistry()
    recoveryRegistry.addRoutes(workingRoutes)
    await recoveryRegistry.registerAll(fastify)
  }
}
