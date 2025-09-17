import type { ApiResponse, PaginationMeta } from "@repo/shared-types"
import * as Sentry from "@sentry/node"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"

export interface ResponseBuilderOptions {
  includeRequestId?: boolean
  includeTimestamp?: boolean
  logResponses?: boolean
  sentryIntegration?: boolean
}

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

export class ResponseBuilder {
  private options: Required<ResponseBuilderOptions>

  constructor(options: ResponseBuilderOptions = {}) {
    this.options = {
      includeRequestId: true,
      includeTimestamp: true,
      logResponses: true,
      sentryIntegration: true,
      ...options,
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
      timestamp: this.options.includeTimestamp ? Date.now() : (undefined as never),
      requestId: this.options.includeRequestId ? request.id : undefined,
      meta: responseData.meta,
    }

    if (this.options.logResponses) {
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
      timestamp: this.options.includeTimestamp ? Date.now() : (undefined as never),
      requestId: this.options.includeRequestId ? request.id : undefined,
    }

    if (this.options.logResponses) {
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

    if (this.options.sentryIntegration && finalStatusCode >= 500) {
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

  unauthorized(reply: FastifyReply, request: FastifyRequest, customMessage?: string, userMessage?: string): void {
    this.error(reply, request, {
      code: "UNAUTHORIZED",
      message: customMessage || "Authentication required",
      userMessage: userMessage || "Please log in to access this resource",
      statusCode: 401,
    })
  }

  forbidden(reply: FastifyReply, request: FastifyRequest, customMessage?: string, userMessage?: string): void {
    this.error(reply, request, {
      code: "FORBIDDEN",
      message: customMessage || "Insufficient permissions",
      userMessage: userMessage || "You don't have permission to access this resource",
      statusCode: 403,
    })
  }

  notFound(reply: FastifyReply, request: FastifyRequest, customMessage?: string, userMessage?: string): void {
    this.error(reply, request, {
      code: "NOT_FOUND",
      message: customMessage || "Resource not found",
      userMessage: userMessage || "The requested resource was not found",
      statusCode: 404,
    })
  }

  badRequest(
    reply: FastifyReply,
    request: FastifyRequest,
    customMessage?: string,
    userMessage?: string,
    details?: Record<string, unknown>,
  ): void {
    this.error(reply, request, {
      code: "BAD_REQUEST",
      message: customMessage || "Invalid request",
      userMessage: userMessage || "Please check your request and try again",
      details,
      statusCode: 400,
    })
  }

  validationError(
    reply: FastifyReply,
    request: FastifyRequest,
    validationErrors: Record<string, string[]>,
    userMessage?: string,
  ): void {
    this.error(reply, request, {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      userMessage: userMessage || "Please correct the errors and try again",
      details: { validationErrors },
      statusCode: 422,
    })
  }

  internalError(reply: FastifyReply, request: FastifyRequest, error: Error, userMessage?: string): void {
    this.error(reply, request, {
      code: "INTERNAL_ERROR",
      message: error.message,
      userMessage: userMessage || "An unexpected error occurred. Please try again later",
      details: {
        originalError: error,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      statusCode: 500,
    })
  }

  paginated<T = unknown>(
    reply: FastifyReply,
    request: FastifyRequest,
    data: T[],
    meta: PaginationMeta,
    statusCode = 200,
  ): void {
    this.success(reply, request, { data, meta }, statusCode)
  }
}

export const responseBuilder = new ResponseBuilder()
