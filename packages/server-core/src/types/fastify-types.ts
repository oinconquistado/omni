import type { FastifyInstance as BaseFastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"

export type {
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RouteHandler,
  RouteHandlerMethod,
  RouteOptions,
} from "fastify"

// Use declaration merging to extend FastifyRequest
declare module "fastify" {
  interface FastifyRequest {
    user?: Record<string, unknown>
  }
}

// Extended FastifyInstance with ZodTypeProvider
export type FastifyInstance = BaseFastifyInstance

// Type-safe FastifyInstance with Zod
export type ZodFastifyInstance = BaseFastifyInstance & ZodTypeProvider
