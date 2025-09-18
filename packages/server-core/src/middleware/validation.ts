import { ZodError } from "zod"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"
import type { ValidatedRequest, ValidationErrors, ValidationMiddlewareConfig } from "../types/validation"
import { responseOrchestrator } from "./response-orchestrator"

function formatZodError(zodError: ZodError): string[] {
  return zodError.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
    return `${path}${issue.message}`
  })
}

export function createValidationMiddleware(config: ValidationMiddlewareConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const errors: ValidationErrors = {}
    const validatedRequest = request as ValidatedRequest

    try {
      // Validate body
      if (config.schemas.body && request.body) {
        try {
          const result = await config.schemas.body.parseAsync(request.body)
          validatedRequest.validatedBody = result
        } catch (error) {
          if (error instanceof ZodError) {
            errors.body = formatZodError(error)
          } else {
            errors.body = ["Invalid body format"]
          }
        }
      }

      // Validate query
      if (config.schemas.query && request.query) {
        try {
          const result = await config.schemas.query.parseAsync(request.query)
          validatedRequest.validatedQuery = result
        } catch (error) {
          if (error instanceof ZodError) {
            errors.query = formatZodError(error)
          } else {
            errors.query = ["Invalid query format"]
          }
        }
      }

      // Validate params
      if (config.schemas.params && request.params) {
        try {
          const result = await config.schemas.params.parseAsync(request.params)
          validatedRequest.validatedParams = result
        } catch (error) {
          if (error instanceof ZodError) {
            errors.params = formatZodError(error)
          } else {
            errors.params = ["Invalid params format"]
          }
        }
      }

      // Validate headers
      if (config.schemas.headers && request.headers) {
        try {
          const result = await config.schemas.headers.parseAsync(request.headers)
          validatedRequest.validatedHeaders = result
        } catch (error) {
          if (error instanceof ZodError) {
            errors.headers = formatZodError(error)
          } else {
            errors.headers = ["Invalid headers format"]
          }
        }
      }

      // If there are validation errors, handle them
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
