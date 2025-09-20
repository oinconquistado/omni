import * as Sentry from "@sentry/node"
import type {
  AuthorizationConfig,
  AuthorizationContext,
  AuthorizationError,
  AuthorizationResult,
  AuthorizedUser,
} from "../types/authorization"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"
import { responseOrchestrator } from "./response-orchestrator"

export function createAuthorizationMiddleware<TRole = string>(config: AuthorizationConfig<TRole>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const context: AuthorizationContext = {
        method: request.method,
        path: request.url,
        headers: request.headers as Record<string, string | string[]>,
        ip: request.ip,
      }

      const user = await config.getUserFromRequest(request)

      if (!user) {
        request.log.error(
          {
            method: request.method,
            url: request.url,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
          },
          "Unauthorized access attempt - no user found",
        )

        Sentry.addBreadcrumb({
          message: "Unauthorized access attempt",
          level: "warning",
          data: {
            method: request.method,
            url: request.url,
            ip: request.ip,
          },
        })

        const unauthorizedError: AuthorizationError = config.customConfig?.unauthorizedError || {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          userMessage: "Please log in to access this resource",
        }

        if (config.onUnauthorized) {
          return config.onUnauthorized(request, reply, unauthorizedError)
        }

        return responseOrchestrator.error(reply, request, {
          code: "UNAUTHORIZED",
          message: unauthorizedError.message,
          userMessage: unauthorizedError.userMessage,
          statusCode: 401,
        })
      }

      const hasValidRole = config.roles.includes(user.role)
      const hasValidPermissions =
        !config.permissions ||
        (user.permissions && config.permissions.every((perm) => user.permissions?.includes(perm) ?? false))

      let customValidationResult: AuthorizationResult | undefined

      if (config.customConfig?.customValidator) {
        customValidationResult = config.customConfig.customValidator(user, context)
      }

      const isAuthorized = hasValidRole && hasValidPermissions && customValidationResult?.authorized !== false

      if (!isAuthorized) {
        request.log.error(
          {
            method: request.method,
            url: request.url,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            userRole: user.role,
            userPermissions: user.permissions,
            requiredRoles: config.roles,
            requiredPermissions: config.permissions,
            userId: user.id,
            customValidationFailed: customValidationResult?.authorized === false,
          },
          "Forbidden access attempt - insufficient permissions",
        )

        Sentry.addBreadcrumb({
          message: "Forbidden access attempt",
          level: "warning",
          data: {
            method: request.method,
            url: request.url,
            ip: request.ip,
            userRole: user.role,
            requiredRoles: config.roles,
            userId: user.id,
          },
        })

        const forbiddenError: AuthorizationError = customValidationResult?.error ||
          config.customConfig?.forbiddenError || {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
            userMessage: "You don't have permission to access this resource",
          }

        if (config.onForbidden) {
          return config.onForbidden(request, reply, forbiddenError)
        }

        return responseOrchestrator.error(reply, request, {
          code: "FORBIDDEN",
          message: forbiddenError.message,
          userMessage: forbiddenError.userMessage,
          statusCode: 403,
        })
      }

      request.user = user

      request.log.info(
        {
          method: request.method,
          url: request.url,
          userRole: user.role,
          userId: user.id,
        },
        "Authorization successful",
      )
    } catch (error) {
      request.log.error(
        {
          method: request.method,
          url: request.url,
          error: {
            name: error instanceof Error ? error.name : "Unknown",
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
        "Authorization middleware error",
      )

      Sentry.captureException(error, {
        tags: {
          component: "authorization-middleware",
        },
        extra: {
          method: request.method,
          url: request.url,
          ip: request.ip,
        },
      })

      return responseOrchestrator.error(reply, request, {
        code: "AUTHORIZATION_ERROR",
        message: "Authorization check failed",
        statusCode: 500,
        details: { originalError: error },
      })
    }
  }
}

export function authorize<TRole = string>(
  roles: TRole[],
  getUserFromRequest: (request: FastifyRequest) => Promise<AuthorizedUser<TRole> | null> | AuthorizedUser<TRole> | null,
  options?: {
    permissions?: string[]
    customMessages?: {
      unauthorized?: { message: string; userMessage?: string }
      forbidden?: { message: string; userMessage?: string }
    }
    customValidator?: (user: AuthorizedUser<TRole>, context: AuthorizationContext) => AuthorizationResult
    onUnauthorized?: (request: FastifyRequest, reply: FastifyReply, error: AuthorizationError) => Promise<void> | void
    onForbidden?: (request: FastifyRequest, reply: FastifyReply, error: AuthorizationError) => Promise<void> | void
  },
) {
  const customConfig = {
    unauthorizedError: options?.customMessages?.unauthorized
      ? {
          code: "UNAUTHORIZED",
          message: options.customMessages.unauthorized.message,
          userMessage: options.customMessages.unauthorized.userMessage,
        }
      : undefined,
    forbiddenError: options?.customMessages?.forbidden
      ? {
          code: "FORBIDDEN",
          message: options.customMessages.forbidden.message,
          userMessage: options.customMessages.forbidden.userMessage,
        }
      : undefined,
    customValidator: options?.customValidator,
  }

  return createAuthorizationMiddleware({
    roles,
    permissions: options?.permissions,
    getUserFromRequest,
    onUnauthorized: options?.onUnauthorized,
    onForbidden: options?.onForbidden,
    customConfig,
  })
}
