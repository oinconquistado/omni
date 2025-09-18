import type { FastifyReply, FastifyRequest } from "../types/fastify-types"
import type { ValidatedRequest, ValidationErrors, ValidationMiddlewareConfig } from "../types/validation"
import { responseOrchestrator } from "./response-orchestrator"

export function createValidationMiddleware(config: ValidationMiddlewareConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const errors: ValidationErrors = {}
    const validatedRequest = request as ValidatedRequest

    try {
      if (config.schemas.body && request.body) {
        try {
          const result = config.schemas.body.parse(request.body)
          validatedRequest.validatedBody = result
        } catch (error) {
          if (error && typeof error === "object" && "errors" in error) {
            errors.body = (error as any).errors.map((err: any) => err.message)
          }
        }
      }

      if (config.schemas.query && request.query) {
        try {
          const result = config.schemas.query.parse(request.query)
          validatedRequest.validatedQuery = result
        } catch (error) {
          if (error && typeof error === "object" && "errors" in error) {
            errors.query = (error as any).errors.map((err: any) => err.message)
          }
        }
      }

      if (config.schemas.params && request.params) {
        try {
          const result = config.schemas.params.parse(request.params)
          validatedRequest.validatedParams = result
        } catch (error) {
          if (error && typeof error === "object" && "errors" in error) {
            errors.params = (error as any).errors.map((err: any) => err.message)
          }
        }
      }

      if (config.schemas.headers && request.headers) {
        try {
          const result = config.schemas.headers.parse(request.headers)
          validatedRequest.validatedHeaders = result
        } catch (error) {
          if (error && typeof error === "object" && "errors" in error) {
            errors.headers = (error as any).errors.map((err: any) => err.message)
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        if (config.options?.onValidationError) {
          await config.options.onValidationError(errors, request, reply)
          return
        }

        const customMessages = config.options?.customErrorMessages || {}
        const errorMessage = customMessages.validation || "Validation failed"

        responseOrchestrator.error(reply, request, {
          code: "VALIDATION_ERROR",
          message: errorMessage,
          details: { validationErrors: errors },
          statusCode: 400,
        })
        return
      }
    } catch (_error) {
      responseOrchestrator.error(reply, request, {
        code: "VALIDATION_INTERNAL_ERROR",
        message: "Internal validation error",
        statusCode: 500,
        details: { originalError: _error },
      })
      return
    }
  }
}

export function validate(
  schemas: ValidationMiddlewareConfig["schemas"],
  options?: ValidationMiddlewareConfig["options"],
) {
  return createValidationMiddleware({ schemas, options })
}
