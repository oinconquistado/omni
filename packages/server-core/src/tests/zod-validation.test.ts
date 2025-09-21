import { describe, expect, it } from "vitest"
import { z } from "zod"
import { createTypedRoute, createValidationSchemas, type InferRouteTypes } from "../utils/zod-validation"

describe("Zod Validation Utils", () => {
  describe("createValidationSchemas", () => {
    it("should return the same schemas object", () => {
      const schemas = {
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }),
        query: z.object({
          page: z.string().transform(Number).pipe(z.number().min(1)),
          limit: z.string().transform(Number).pipe(z.number().max(100)).optional(),
        }),
      }

      const result = createValidationSchemas(schemas)

      expect(result).toBe(schemas)
      expect(result.body).toBe(schemas.body)
      expect(result.query).toBe(schemas.query)
    })

    it("should work with empty schemas object", () => {
      const schemas = {}

      const result = createValidationSchemas(schemas)

      expect(result).toBe(schemas)
      expect(Object.keys(result)).toHaveLength(0)
    })

    it("should work with partial schemas", () => {
      const schemas = {
        params: z.object({
          id: z.string().uuid(),
        }),
      }

      const result = createValidationSchemas(schemas)

      expect(result).toBe(schemas)
      expect(result.params).toBe(schemas.params)
    })
  })

  describe("createTypedRoute", () => {
    it("should create a typed route with minimal config", () => {
      const route = createTypedRoute({
        method: "GET",
        controller: "test-controller",
      })

      expect(route).toEqual({
        method: "GET",
        controller: "test-controller",
      })
    })

    it("should create a typed route with validation schemas", () => {
      const bodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })

      const querySchema = z.object({
        page: z.number().min(1),
      })

      const route = createTypedRoute({
        method: "POST",
        controller: "auth-controller",
        validation: {
          body: bodySchema,
          query: querySchema,
        },
      })

      expect(route).toEqual({
        method: "POST",
        controller: "auth-controller",
        validation: {
          body: bodySchema,
          query: querySchema,
        },
      })
    })

    it("should create a typed route with authorization config", () => {
      const route = createTypedRoute({
        method: "PUT",
        controller: "user-controller",
        authorization: {
          requireAuth: true,
          roles: ["admin"],
        },
      })

      expect(route).toEqual({
        method: "PUT",
        controller: "user-controller",
        authorization: {
          requireAuth: true,
          roles: ["admin"],
        },
      })
    })

    it("should create a typed route with paginated flag", () => {
      const route = createTypedRoute({
        method: "GET",
        controller: "list-controller",
        paginated: true,
      })

      expect(route).toEqual({
        method: "GET",
        controller: "list-controller",
        paginated: true,
      })
    })

    it("should create a typed route with all options", () => {
      const bodySchema = z.object({
        name: z.string(),
      })

      const paramsSchema = z.object({
        id: z.string(),
      })

      const route = createTypedRoute({
        method: "PATCH",
        controller: "update-controller",
        validation: {
          body: bodySchema,
          params: paramsSchema,
        },
        authorization: {
          requireAuth: true,
        },
        paginated: false,
      })

      expect(route).toEqual({
        method: "PATCH",
        controller: "update-controller",
        validation: {
          body: bodySchema,
          params: paramsSchema,
        },
        authorization: {
          requireAuth: true,
        },
        paginated: false,
      })
    })

    it("should support all HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const

      methods.forEach((method) => {
        const route = createTypedRoute({
          method,
          controller: `${method.toLowerCase()}-controller`,
        })

        expect(route.method).toBe(method)
      })
    })
  })

  describe("InferRouteTypes", () => {
    it("should infer types correctly", () => {
      const schemas = {
        body: z.object({
          email: z.string().email(),
          age: z.number().min(18),
        }),
        query: z.object({
          page: z.number(),
          search: z.string().optional(),
        }),
        params: z.object({
          id: z.string(),
        }),
      }

      // This is a type test - we can't actually test the types at runtime,
      // but we can ensure the utility doesn't break
      type RouteTypes = InferRouteTypes<typeof schemas>

      // Type assertion to ensure the type system works
      const _typeCheck: RouteTypes = {
        body: {
          email: "test@example.com",
          age: 25,
        },
        query: {
          page: 1,
          search: "optional search",
        },
        params: {
          id: "test-id",
        },
      }

      // This test passes if TypeScript compilation succeeds
      expect(true).toBe(true)
    })

    it("should handle partial schemas in type inference", () => {
      const schemas = {
        body: z.object({
          name: z.string(),
        }),
      }

      type RouteTypes = InferRouteTypes<typeof schemas>

      const _typeCheck: RouteTypes = {
        body: {
          name: "test",
        },
      }

      expect(true).toBe(true)
    })

    it("should handle complex schema types", () => {
      const schemas = {
        body: z.object({
          user: z.object({
            profile: z.object({
              name: z.string(),
              settings: z.array(z.string()),
            }),
          }),
        }),
      }

      type RouteTypes = InferRouteTypes<typeof schemas>

      const _typeCheck: RouteTypes = {
        body: {
          user: {
            profile: {
              name: "test",
              settings: ["setting1", "setting2"],
            },
          },
        },
      }

      expect(true).toBe(true)
    })
  })
})
