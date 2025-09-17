import { ResponseBuilder } from "../response/response-builder"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"
import type { SanitizationRule } from "../types/sanitization"
import { createResponseSanitizationMiddleware } from "./sanitization"

export interface ResponseOrchestratorConfig {
  sanitization?: {
    globalRules?: SanitizationRule[]
    routeSpecificRules?: Record<string, SanitizationRule[]>
    roleBasedRules?: Record<string, SanitizationRule[]>
  }
  responseBuilder?: {
    includeRequestId?: boolean
    includeTimestamp?: boolean
    logResponses?: boolean
    sentryIntegration?: boolean
  }
}

export class ResponseOrchestrator {
  private responseBuilder: ResponseBuilder
  private sanitizationMiddleware: ReturnType<typeof createResponseSanitizationMiddleware> | null = null

  constructor(config: ResponseOrchestratorConfig = {}) {
    this.responseBuilder = new ResponseBuilder(config.responseBuilder)

    if (config.sanitization) {
      this.sanitizationMiddleware = createResponseSanitizationMiddleware(config.sanitization)
    }
  }

  async sendSuccess<T = unknown>(
    reply: FastifyReply,
    request: FastifyRequest,
    data: T,
    options?: {
      statusCode?: number
      meta?: any
      message?: string
      skipSanitization?: boolean
    },
  ): Promise<void> {
    let responseData = data

    if (this.sanitizationMiddleware && !options?.skipSanitization) {
      responseData = (await this.sanitizationMiddleware(request, reply, data)) as T
    }

    this.responseBuilder.success(
      reply,
      request,
      {
        data: responseData,
        meta: options?.meta,
        message: options?.message,
      },
      options?.statusCode,
    )
  }

  async sendPaginated<T = unknown>(
    reply: FastifyReply,
    request: FastifyRequest,
    data: T[],
    meta: any,
    options?: {
      statusCode?: number
      skipSanitization?: boolean
    },
  ): Promise<void> {
    let responseData = data

    if (this.sanitizationMiddleware && !options?.skipSanitization) {
      responseData = (await this.sanitizationMiddleware(request, reply, data)) as T[]
    }

    this.responseBuilder.paginated(reply, request, responseData, meta, options?.statusCode)
  }

  sendError(
    reply: FastifyReply,
    request: FastifyRequest,
    errorData: {
      code: string
      message: string
      userMessage?: string
      details?: Record<string, unknown>
      statusCode?: number
    },
  ): void {
    this.responseBuilder.error(reply, request, errorData)
  }

  sendUnauthorized(reply: FastifyReply, request: FastifyRequest, customMessage?: string, userMessage?: string): void {
    this.responseBuilder.unauthorized(reply, request, customMessage, userMessage)
  }

  sendForbidden(reply: FastifyReply, request: FastifyRequest, customMessage?: string, userMessage?: string): void {
    this.responseBuilder.forbidden(reply, request, customMessage, userMessage)
  }

  sendNotFound(reply: FastifyReply, request: FastifyRequest, customMessage?: string, userMessage?: string): void {
    this.responseBuilder.notFound(reply, request, customMessage, userMessage)
  }

  sendBadRequest(
    reply: FastifyReply,
    request: FastifyRequest,
    customMessage?: string,
    userMessage?: string,
    details?: Record<string, unknown>,
  ): void {
    this.responseBuilder.badRequest(reply, request, customMessage, userMessage, details)
  }

  sendValidationError(
    reply: FastifyReply,
    request: FastifyRequest,
    validationErrors: Record<string, string[]>,
    userMessage?: string,
  ): void {
    this.responseBuilder.validationError(reply, request, validationErrors, userMessage)
  }

  sendInternalError(reply: FastifyReply, request: FastifyRequest, error: Error, userMessage?: string): void {
    this.responseBuilder.internalError(reply, request, error, userMessage)
  }
}

export function createResponseOrchestrator(config: ResponseOrchestratorConfig = {}) {
  return new ResponseOrchestrator(config)
}

export const defaultResponseOrchestrator = new ResponseOrchestrator()
