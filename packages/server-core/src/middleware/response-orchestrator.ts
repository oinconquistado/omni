import type { ApiResponse, PaginationMeta } from "@repo/shared-types-and-schemas"
import * as Sentry from "@sentry/node"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"
import type { SanitizationRule } from "../types/sanitization"
import { createResponseSanitizationMiddleware } from "./sanitization"

export interface SuccessResponseData<T = unknown> {
  data: T
  meta?: PaginationMeta
  message?: string
}

export interface ErrorResponseData {
  code: string
  message: string
  userMessage?: string
  details?: Record<string, unknown>
  statusCode?: number
}

export interface ResponseOrchestratorConfig {
  sanitization?: {
    globalRules?: SanitizationRule[]
    routeSpecificRules?: Record<string, SanitizationRule[]>
    roleBasedRules?: Record<string, SanitizationRule[]>
  }
  includeRequestId?: boolean
  includeTimestamp?: boolean
  logResponses?: boolean
  sentryIntegration?: boolean
}

export class ResponseOrchestrator {
  private config: Required<ResponseOrchestratorConfig>
  private sanitizationMiddleware: ReturnType<typeof createResponseSanitizationMiddleware> | null = null

  constructor(config: ResponseOrchestratorConfig = {}) {
    this.config = {
      includeRequestId: true,
      includeTimestamp: true,
      logResponses: true,
      sentryIntegration: true,
      ...config,
    } as Required<ResponseOrchestratorConfig>

    if (config.sanitization) {
      this.sanitizationMiddleware = createResponseSanitizationMiddleware(config.sanitization)
    }
  }

  success<T = unknown>(
    reply: FastifyReply,
    request: FastifyRequest,
    responseData: SuccessResponseData<T>,
    statusCode = 200,
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data: responseData.data,
      timestamp: this.config.includeTimestamp ? Date.now() : (undefined as never),
      requestId: this.config.includeRequestId ? request.id : undefined,
      meta: responseData.meta,
    }

    if (this.config.logResponses) {
      request.log.info(
        {
          method: request.method,
          url: request.url,
          statusCode,
          responseDataType: typeof responseData.data,
          hasMetadata: !!responseData.meta,
          requestId: request.id,
        },
        "Successful response sent",
      )
    }

    reply.status(statusCode).send(response)
  }

  error(reply: FastifyReply, request: FastifyRequest, errorData: ErrorResponseData, statusCode?: number): void {
    const finalStatusCode = statusCode || errorData.statusCode || 500

    const apiError = {
      code: errorData.code,
      message: errorData.message,
      userMessage: errorData.userMessage,
      details: errorData.details,
    }

    const response: ApiResponse = {
      success: false,
      error: apiError,
      timestamp: this.config.includeTimestamp ? Date.now() : (undefined as never),
      requestId: this.config.includeRequestId ? request.id : undefined,
    }

    if (this.config.logResponses) {
      const logLevel = finalStatusCode >= 500 ? "error" : "warn"
      request.log[logLevel](
        {
          method: request.method,
          url: request.url,
          statusCode: finalStatusCode,
          errorCode: errorData.code,
          errorMessage: errorData.message,
          userMessage: errorData.userMessage,
          requestId: request.id,
        },
        "Error response sent",
      )
    }

    if (this.config.sentryIntegration && finalStatusCode >= 500) {
      Sentry.addBreadcrumb({
        message: "Server error response",
        level: "error",
        data: {
          method: request.method,
          url: request.url,
          statusCode: finalStatusCode,
          errorCode: errorData.code,
          errorMessage: errorData.message,
          requestId: request.id,
        },
      })

      if (errorData.details?.originalError instanceof Error) {
        Sentry.captureException(errorData.details.originalError)
      }
    }

    reply.status(finalStatusCode).send(response)
  }

  async sendSuccess<T = unknown>(
    reply: FastifyReply,
    request: FastifyRequest,
    data: T,
    options?: {
      statusCode?: number
      meta?: PaginationMeta
      message?: string
      skipSanitization?: boolean
    },
  ): Promise<void> {
    let responseData = data

    if (this.sanitizationMiddleware && !options?.skipSanitization) {
      responseData = (await this.sanitizationMiddleware(request, reply, data)) as T
    }

    this.success(
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
    meta: PaginationMeta,
    options?: {
      statusCode?: number
      skipSanitization?: boolean
    },
  ): Promise<void> {
    let responseData = data

    if (this.sanitizationMiddleware && !options?.skipSanitization) {
      responseData = (await this.sanitizationMiddleware(request, reply, data)) as T[]
    }

    this.success(reply, request, { data: responseData, meta }, options?.statusCode)
  }
}

export function createResponseOrchestrator(config: ResponseOrchestratorConfig = {}) {
  return new ResponseOrchestrator(config)
}

// Create a default instance for convenient use
export const responseOrchestrator = new ResponseOrchestrator()

// Keep legacy export for backward compatibility
export const defaultResponseOrchestrator = responseOrchestrator
