import { availableParallelism } from "node:os"
import type { FastifyInstance } from "../types/fastify-types"

export interface ManualRoute {
  id: string
  priority?: number
  register: (fastify: FastifyInstance) => Promise<void>
}

export interface ManualRouteRegistryConfig {
  maxConcurrency?: number
  useWorkerThreads?: boolean
  enableProfiling?: boolean
}

export class ManualRouteRegistry {
  private routes: ManualRoute[] = []
  private registeredRoutes = new Set<string>()
  private config: Required<ManualRouteRegistryConfig>

  constructor(config: ManualRouteRegistryConfig = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency ?? availableParallelism(),
      useWorkerThreads: config.useWorkerThreads ?? false,
      enableProfiling: config.enableProfiling ?? false,
    }
  }

  /**
   * Adds a manual route to the registry
   * Can be called multiple times across different modules
   */
  addRoute(route: ManualRoute): void {
    if (this.registeredRoutes.has(route.id)) {
      throw new Error(`Route with id "${route.id}" already exists`)
    }

    this.routes.push({
      ...route,
      priority: route.priority ?? 0,
    })
    this.registeredRoutes.add(route.id)
  }

  /**
   * Adds multiple routes at once
   */
  addRoutes(routes: ManualRoute[]): void {
    for (const route of routes) {
      this.addRoute(route)
    }
  }

  /**
   * Registers all routes with optimal concurrency and order
   */
  async registerAll(fastify: FastifyInstance): Promise<void> {
    if (this.routes.length === 0) {
      return
    }

    const startTime = this.config.enableProfiling ? performance.now() : 0

    // Sort by priority (higher priority first)
    const sortedRoutes = this.sortRoutesByPriority()

    // Group routes by priority for batch processing
    const routeGroups = this.groupRoutesByPriority(sortedRoutes)

    // Process groups sequentially to maintain priority order
    await this.processRouteGroupsSequentially(fastify, routeGroups)

    if (this.config.enableProfiling) {
      const endTime = performance.now()
      console.log(`Manual routes registered in ${endTime - startTime}ms`)
    }
  }

  private async processRouteGroupsSequentially(fastify: FastifyInstance, routeGroups: ManualRoute[][]): Promise<void> {
    if (routeGroups.length === 0) return

    const [firstGroup, ...remainingGroups] = routeGroups
    if (firstGroup) {
      await this.processRouteGroup(fastify, firstGroup)
    }

    if (remainingGroups.length > 0) {
      await this.processRouteGroupsSequentially(fastify, remainingGroups)
    }
  }

  /**
   * Gets the count of registered routes
   */
  getRouteCount(): number {
    return this.routes.length
  }

  /**
   * Checks if a route exists
   */
  hasRoute(id: string): boolean {
    return this.registeredRoutes.has(id)
  }

  /**
   * Clears all routes (useful for testing)
   */
  clear(): void {
    this.routes = []
    this.registeredRoutes.clear()
  }

  /**
   * Gets all route IDs sorted by priority
   */
  getRouteIds(): string[] {
    return this.sortRoutesByPriority().map((route) => route.id)
  }

  private sortRoutesByPriority(): ManualRoute[] {
    return [...this.routes].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  private groupRoutesByPriority(routes: ManualRoute[]): ManualRoute[][] {
    const groups: Record<number, ManualRoute[]> = {}

    for (const route of routes) {
      const priority = route.priority ?? 0
      if (!groups[priority]) {
        groups[priority] = []
      }
      groups[priority].push(route)
    }

    // Return groups ordered by priority (highest first)
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map((priority) => groups[priority])
      .filter((group): group is ManualRoute[] => group !== undefined)
  }

  private async processRouteGroup(fastify: FastifyInstance, group: ManualRoute[]): Promise<void> {
    if (group.length === 0) {
      return
    }

    if (group.length === 1) {
      // Single route, no need for concurrency control
      const route = group[0]
      if (route) {
        await route.register(fastify)
      }
      return
    }

    // Process routes in batches based on maxConcurrency
    const batchSize = Math.min(group.length, this.config.maxConcurrency)

    await this.processBatchesSequentially(fastify, group, batchSize)
  }

  private async processBatchesSequentially(
    fastify: FastifyInstance,
    routes: ManualRoute[],
    batchSize: number,
  ): Promise<void> {
    if (routes.length === 0) return

    const batch = routes.slice(0, batchSize)
    const remainingRoutes = routes.slice(batchSize)

    const promises = batch.map((route) => route.register(fastify))
    await Promise.all(promises)

    if (remainingRoutes.length > 0) {
      await this.processBatchesSequentially(fastify, remainingRoutes, batchSize)
    }
  }
}

// Global registry instance
let globalRegistry: ManualRouteRegistry | null = null

/**
 * Gets or creates the global manual route registry
 */
export function getManualRouteRegistry(config?: ManualRouteRegistryConfig): ManualRouteRegistry {
  if (!globalRegistry) {
    globalRegistry = new ManualRouteRegistry(config)
  }
  return globalRegistry
}

/**
 * Convenience function to add a route to the global registry
 */
export function addManualRoute(route: ManualRoute): void {
  const registry = getManualRouteRegistry()
  registry.addRoute(route)
}

/**
 * Convenience function to add multiple routes to the global registry
 */
export function addManualRoutes(routes: ManualRoute[]): void {
  const registry = getManualRouteRegistry()
  registry.addRoutes(routes)
}

/**
 * Registers all manual routes from the global registry
 */
export async function registerAllManualRoutes(
  fastify: FastifyInstance,
  config?: ManualRouteRegistryConfig,
): Promise<void> {
  const registry = getManualRouteRegistry(config)
  await registry.registerAll(fastify)
}

/**
 * Clears the global registry (useful for testing)
 */
export function clearGlobalRegistry(): void {
  if (globalRegistry) {
    globalRegistry.clear()
  }
  globalRegistry = null
}
