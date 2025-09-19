import type { z } from "zod"
import type { ValidationSchemas } from "../types/validation"

/**
 * Helper function to create validation schemas for routes
 *
 * @example
 * ```typescript
 * import { z } from "zod"
 * import { createValidationSchemas } from "@repo/server-core"
 *
 * const schemas = createValidationSchemas({
 *   body: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   }),
 *   query: z.object({
 *     page: z.string().transform(Number).pipe(z.number().min(1))
 *   })
 * })
 * ```
 */
export function createValidationSchemas(schemas: ValidationSchemas): ValidationSchemas {
  return schemas
}

/**
 * Creates a typed route configuration with validation schemas
 *
 * @example
 * ```typescript
 * import { z } from "zod"
 * import { createTypedRoute } from "@repo/server-core"
 *
 * const loginRoute = createTypedRoute({
 *   method: "POST",
 *   controller: "login-controller",
 *   validation: {
 *     body: z.object({
 *       email: z.string().email(),
 *       password: z.string().min(1)
 *     })
 *   }
 * })
 * ```
 */
export function createTypedRoute<
  TBody extends z.ZodSchema = z.ZodAny,
  TQuery extends z.ZodSchema = z.ZodAny,
  TParams extends z.ZodSchema = z.ZodAny,
  THeaders extends z.ZodSchema = z.ZodAny,
>(config: {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  controller: string
  validation?: {
    body?: TBody
    query?: TQuery
    params?: TParams
    headers?: THeaders
  }
  authorization?: Record<string, unknown>
  paginated?: boolean
}) {
  return config
}

/**
 * Extracts the inferred types from validation schemas
 *
 * @example
 * ```typescript
 * const schemas = {
 *   body: z.object({ email: z.string().email() }),
 *   query: z.object({ page: z.number() })
 * }
 *
 * type RouteTypes = InferRouteTypes<typeof schemas>
 * // RouteTypes = {
 * //   body: { email: string }
 * //   query: { page: number }
 * // }
 * ```
 */
export type InferRouteTypes<T extends ValidationSchemas> = {
  [K in keyof T]: T[K] extends z.ZodSchema<infer U> ? U : never
}
