type ZodSchema = any

import type { FastifyReply, FastifyRequest } from "./fastify-types"

export interface ValidationSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
  headers?: ZodSchema
}

export interface ValidationOptions {
  abortEarly?: boolean
  stripUnknown?: boolean
  customErrorMessages?: Record<string, string>
  onValidationError?: (errors: ValidationErrors, request: FastifyRequest, reply: FastifyReply) => Promise<void> | void
}

export interface ValidationErrors {
  [key: string]: string[]
}

export interface ValidationMiddlewareConfig {
  schemas: ValidationSchemas
  options?: ValidationOptions
}

export interface ValidatedRequest<T = unknown, Q = unknown, P = unknown, H = unknown> extends FastifyRequest {
  validatedBody?: T
  validatedQuery?: Q
  validatedParams?: P
  validatedHeaders?: H
}
