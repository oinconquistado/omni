import * as Sentry from "@sentry/node"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"

export interface AuthorizedUser<TRole = unknown> {
  role: TRole
  id?: string | number
  [key: string]: unknown
}

export interface AuthorizationConfig<TRole = unknown> {
  roles: TRole[]
  getUserFromRequest: (request: FastifyRequest) => AuthorizedUser<TRole> | null
  onUnauthorized?: (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void
  onForbidden?: (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void
}

export function createAuthorizationMiddleware<TRole = unknown>(config: AuthorizationConfig<TRole>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const user = config.getUserFromRequest(request)

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

        if (config.onUnauthorized) {
          return config.onUnauthorized(request, reply)
        }

        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
          message: "Authentication required",
        })
      }

      if (!config.roles.includes(user.role)) {
        request.log.error(
          {
            method: request.method,
            url: request.url,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            userRole: user.role,
            requiredRoles: config.roles,
            userId: user.id,
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

        if (config.onForbidden) {
          return config.onForbidden(request, reply)
        }

        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: "Insufficient permissions",
        })
      }

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

      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: "Authorization check failed",
      })
    }
  }
}

export function authorize<TRole = unknown>(
  roles: TRole[],
  getUserFromRequest: (request: FastifyRequest) => AuthorizedUser<TRole> | null,
  options?: {
    onUnauthorized?: (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void
    onForbidden?: (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void
  },
) {
  return createAuthorizationMiddleware({
    roles,
    getUserFromRequest,
    onUnauthorized: options?.onUnauthorized,
    onForbidden: options?.onForbidden,
  })
}
