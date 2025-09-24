import fastify from "fastify"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  addManualRoute,
  addManualRoutes,
  clearGlobalRegistry,
  getManualRouteRegistry,
  type ManualRoute,
  ManualRouteRegistry,
  registerAllManualRoutes,
} from "../routes/manual-routes-registry"
import type { FastifyInstance } from "../types/fastify-types"

describe("ManualRouteRegistry", () => {
  let app: FastifyInstance
  let registry: ManualRouteRegistry

  beforeEach(async () => {
    app = fastify({ logger: false })
    registry = new ManualRouteRegistry()
    clearGlobalRegistry()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("addRoute", () => {
    it("should add a route successfully", () => {
      const route: ManualRoute = {
        id: "test-route",
        register: async (fastify) => {
          fastify.get("/test", async () => ({ message: "test" }))
        },
      }

      registry.addRoute(route)
      expect(registry.hasRoute("test-route")).toBe(true)
      expect(registry.getRouteCount()).toBe(1)
    })

    it("should throw error when adding duplicate route id", () => {
      const route: ManualRoute = {
        id: "duplicate-route",
        register: async (fastify) => {
          fastify.get("/duplicate", async () => ({ message: "duplicate" }))
        },
      }

      registry.addRoute(route)
      expect(() => registry.addRoute(route)).toThrow('Route with id "duplicate-route" already exists')
    })

    it("should set default priority to 0", () => {
      const route: ManualRoute = {
        id: "no-priority",
        register: async (fastify) => {
          fastify.get("/no-priority", async () => ({ message: "no-priority" }))
        },
      }

      registry.addRoute(route)
      expect(registry.getRouteIds()).toEqual(["no-priority"])
    })
  })

  describe("addRoutes", () => {
    it("should add multiple routes at once", () => {
      const routes: ManualRoute[] = [
        {
          id: "route-1",
          register: async (fastify) => {
            fastify.get("/route1", async () => ({ message: "route1" }))
          },
        },
        {
          id: "route-2",
          priority: 10,
          register: async (fastify) => {
            fastify.get("/route2", async () => ({ message: "route2" }))
          },
        },
      ]

      registry.addRoutes(routes)
      expect(registry.getRouteCount()).toBe(2)
      expect(registry.hasRoute("route-1")).toBe(true)
      expect(registry.hasRoute("route-2")).toBe(true)
    })
  })

  describe("priority handling", () => {
    it("should sort routes by priority (highest first)", () => {
      const routes: ManualRoute[] = [
        {
          id: "low",
          priority: 1,
          register: async (fastify) => {
            fastify.get("/low", async () => ({ message: "low" }))
          },
        },
        {
          id: "high",
          priority: 100,
          register: async (fastify) => {
            fastify.get("/high", async () => ({ message: "high" }))
          },
        },
        {
          id: "medium",
          priority: 50,
          register: async (fastify) => {
            fastify.get("/medium", async () => ({ message: "medium" }))
          },
        },
        {
          id: "default",
          register: async (fastify) => {
            fastify.get("/default", async () => ({ message: "default" }))
          },
        }, // priority 0
      ]

      registry.addRoutes(routes)
      const sortedIds = registry.getRouteIds()
      expect(sortedIds).toEqual(["high", "medium", "low", "default"])
    })
  })

  describe("registerAll", () => {
    it("should register routes with correct order", async () => {
      const executionOrder: string[] = []

      const routes: ManualRoute[] = [
        {
          id: "first",
          priority: 100,
          register: async (fastify) => {
            executionOrder.push("first")
            fastify.get("/first", async () => ({ message: "first" }))
          },
        },
        {
          id: "second",
          priority: 50,
          register: async (fastify) => {
            executionOrder.push("second")
            fastify.get("/second", async () => ({ message: "second" }))
          },
        },
        {
          id: "third",
          priority: 10,
          register: async (fastify) => {
            executionOrder.push("third")
            fastify.get("/third", async () => ({ message: "third" }))
          },
        },
      ]

      registry.addRoutes(routes)
      await registry.registerAll(app)
      await app.ready()

      // Check execution order matches priority order
      expect(executionOrder).toEqual(["first", "second", "third"])

      // Test that routes are working
      const response1 = await app.inject({ method: "GET", url: "/first" })
      expect(response1.json()).toEqual({ message: "first" })

      const response2 = await app.inject({ method: "GET", url: "/second" })
      expect(response2.json()).toEqual({ message: "second" })

      const response3 = await app.inject({ method: "GET", url: "/third" })
      expect(response3.json()).toEqual({ message: "third" })
    })

    it("should handle empty route registry", async () => {
      await expect(registry.registerAll(app)).resolves.toBeUndefined()
    })

    it("should process routes with same priority in parallel", async () => {
      const startTimes: Record<string, number> = {}
      const endTimes: Record<string, number> = {}

      const routes: ManualRoute[] = [
        {
          id: "parallel-1",
          priority: 10,
          register: async (fastify) => {
            startTimes["parallel-1"] = Date.now()
            await new Promise((resolve) => setTimeout(resolve, 50)) // Simulate async work
            endTimes["parallel-1"] = Date.now()
            fastify.get("/parallel1", async () => ({ message: "parallel1" }))
          },
        },
        {
          id: "parallel-2",
          priority: 10,
          register: async (fastify) => {
            startTimes["parallel-2"] = Date.now()
            await new Promise((resolve) => setTimeout(resolve, 50)) // Simulate async work
            endTimes["parallel-2"] = Date.now()
            fastify.get("/parallel2", async () => ({ message: "parallel2" }))
          },
        },
      ]

      registry.addRoutes(routes)
      await registry.registerAll(app)

      // Routes with same priority should run in parallel (start times should be close)
      const time1 = startTimes["parallel-1"]
      const time2 = startTimes["parallel-2"]
      expect(time1).toBeDefined()
      expect(time2).toBeDefined()

      if (time1 && time2) {
        const timeDifference = Math.abs(time1 - time2)
        expect(timeDifference).toBeLessThan(20) // Should start within 20ms of each other
      }
    })
  })

  describe("configuration options", () => {
    it("should respect maxConcurrency setting", async () => {
      const registry = new ManualRouteRegistry({ maxConcurrency: 1 })
      let concurrentCount = 0
      let maxConcurrent = 0

      const routes: ManualRoute[] = Array.from({ length: 3 }, (_, i) => ({
        id: `route-${i}`,
        priority: 10, // Same priority to test concurrency
        register: async (fastify) => {
          concurrentCount++
          maxConcurrent = Math.max(maxConcurrent, concurrentCount)
          await new Promise((resolve) => setTimeout(resolve, 10))
          concurrentCount--
          fastify.get(`/test${i}`, async () => ({ message: `test${i}` }))
        },
      }))

      registry.addRoutes(routes)
      await registry.registerAll(app)

      // With maxConcurrency=1, should never have more than 1 concurrent execution
      expect(maxConcurrent).toBe(1)
    })

    it("should enable profiling when configured", async () => {
      const mockLogDebug = vi.fn()
      app.log.debug = mockLogDebug

      const registry = new ManualRouteRegistry({ enableProfiling: true })

      const route: ManualRoute = {
        id: "profiled-route",
        register: async (fastify) => {
          fastify.get("/profiled", async () => ({ message: "profiled" }))
        },
      }

      registry.addRoute(route)
      await registry.registerAll(app)

      expect(mockLogDebug).toHaveBeenCalledWith(expect.stringContaining("Manual routes registered in"))
    })
  })

  describe("utility methods", () => {
    it("should clear all routes", () => {
      const route: ManualRoute = {
        id: "clear-test",
        register: async (fastify) => {
          fastify.get("/clear-test", async () => ({ message: "clear-test" }))
        },
      }

      registry.addRoute(route)
      expect(registry.getRouteCount()).toBe(1)

      registry.clear()
      expect(registry.getRouteCount()).toBe(0)
      expect(registry.hasRoute("clear-test")).toBe(false)
    })
  })

  describe("global registry functions", () => {
    it("should use global registry instance", () => {
      const globalRegistry = getManualRouteRegistry()
      const sameRegistry = getManualRouteRegistry()
      expect(globalRegistry).toBe(sameRegistry)
    })

    it("should add route to global registry", () => {
      const route: ManualRoute = {
        id: "global-route",
        register: async (fastify) => {
          fastify.get("/global", async () => ({ message: "global" }))
        },
      }

      addManualRoute(route)
      const globalRegistry = getManualRouteRegistry()
      expect(globalRegistry.hasRoute("global-route")).toBe(true)
    })

    it("should add multiple routes to global registry", () => {
      const routes: ManualRoute[] = [
        {
          id: "global-1",
          register: async (fastify) => {
            fastify.get("/global1", async () => ({ message: "global1" }))
          },
        },
        {
          id: "global-2",
          register: async (fastify) => {
            fastify.get("/global2", async () => ({ message: "global2" }))
          },
        },
      ]

      addManualRoutes(routes)
      const globalRegistry = getManualRouteRegistry()
      expect(globalRegistry.getRouteCount()).toBe(2)
    })

    it("should register all routes from global registry", async () => {
      const route: ManualRoute = {
        id: "register-global",
        register: async (fastify) => {
          fastify.get("/register-global", async () => ({ message: "register-global" }))
        },
      }

      addManualRoute(route)
      await registerAllManualRoutes(app)
      await app.ready()

      const response = await app.inject({ method: "GET", url: "/register-global" })
      expect(response.json()).toEqual({ message: "register-global" })
    })

    it("should clear global registry", () => {
      addManualRoute({
        id: "to-clear",
        register: async (fastify) => {
          fastify.get("/to-clear", async () => ({ message: "to-clear" }))
        },
      })

      const globalRegistry = getManualRouteRegistry()
      expect(globalRegistry.getRouteCount()).toBe(1)

      clearGlobalRegistry()
      const newGlobalRegistry = getManualRouteRegistry()
      expect(newGlobalRegistry.getRouteCount()).toBe(0)
    })
  })

  describe("error handling", () => {
    it("should handle route registration errors gracefully", async () => {
      const route: ManualRoute = {
        id: "error-route",
        register: async () => {
          throw new Error("Route registration failed")
        },
      }

      registry.addRoute(route)
      await expect(registry.registerAll(app)).rejects.toThrow("Route registration failed")
    })

    it("should handle concurrent route registration errors", async () => {
      const routes: ManualRoute[] = [
        {
          id: "success-route",
          priority: 10,
          register: async (fastify) => {
            fastify.get("/success", async () => ({ message: "success" }))
          },
        },
        {
          id: "error-route",
          priority: 10,
          register: async () => {
            throw new Error("Concurrent error")
          },
        },
      ]

      registry.addRoutes(routes)
      await expect(registry.registerAll(app)).rejects.toThrow("Concurrent error")
    })
  })
})
