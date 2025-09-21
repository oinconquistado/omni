import * as Sentry from "@sentry/node"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { authorize, createAuthorizationMiddleware } from "../middleware/authorization"
import { responseOrchestrator } from "../middleware/response-orchestrator"
import type { AuthorizationConfig, AuthorizationContext, AuthorizedUser } from "../types/authorization"

// Mock Sentry
vi.mock("@sentry/node", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}))

// Mock response orchestrator
vi.mock("../middleware/response-orchestrator", () => ({
  responseOrchestrator: {
    error: vi.fn(),
  },
}))

describe("Authorization Middleware", () => {
  let mockRequest: any
  let mockReply: any
  let mockUser: AuthorizedUser<string>

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      url: "/test",
      ip: "127.0.0.1",
      headers: {
        "user-agent": "test-agent",
        authorization: "Bearer token123",
      },
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    mockUser = {
      id: "user-123",
      role: "user",
      permissions: ["read", "write"],
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("createAuthorizationMiddleware", () => {
    it("should authorize user with valid role and permissions", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(mockUser)

      const config: AuthorizationConfig<string> = {
        roles: ["user", "admin"],
        permissions: ["read"],
        getUserFromRequest: mockGetUser,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(mockGetUser).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.user).toBe(mockUser)
      expect(mockRequest.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          userRole: "user",
          userId: "user-123",
        }),
        "Authorization successful",
      )
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should handle unauthorized user (no user found)", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(null)

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        getUserFromRequest: mockGetUser,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          ip: "127.0.0.1",
          userAgent: "test-agent",
        }),
        "Unauthorized access attempt - no user found",
      )

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: "Unauthorized access attempt",
        level: "warning",
        data: {
          method: "GET",
          url: "/test",
          ip: "127.0.0.1",
        },
      })

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "UNAUTHORIZED",
          message: "Authentication required",
          userMessage: "Please log in to access this resource",
          statusCode: 401,
        }),
      )
    })

    it("should handle forbidden user (invalid role)", async () => {
      const userWithInvalidRole = { ...mockUser, role: "guest" }
      const mockGetUser = vi.fn().mockResolvedValue(userWithInvalidRole)

      const config: AuthorizationConfig<string> = {
        roles: ["admin"],
        getUserFromRequest: mockGetUser,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          userRole: "guest",
          requiredRoles: ["admin"],
          userId: "user-123",
        }),
        "Forbidden access attempt - insufficient permissions",
      )

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
          statusCode: 403,
        }),
      )
    })

    it("should handle forbidden user (insufficient permissions)", async () => {
      const userWithLimitedPermissions = { ...mockUser, permissions: ["read"] }
      const mockGetUser = vi.fn().mockResolvedValue(userWithLimitedPermissions)

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        permissions: ["read", "write", "delete"],
        getUserFromRequest: mockGetUser,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "FORBIDDEN",
          statusCode: 403,
        }),
      )
    })

    it("should handle custom validator rejection", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(mockUser)
      const customValidator = vi.fn().mockReturnValue({
        authorized: false,
        error: {
          code: "CUSTOM_FORBIDDEN",
          message: "Custom validation failed",
          userMessage: "Custom error message",
        },
      })

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        getUserFromRequest: mockGetUser,
        customConfig: {
          customValidator,
        },
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      const expectedContext: AuthorizationContext = {
        method: "GET",
        path: "/test",
        headers: mockRequest.headers,
        ip: "127.0.0.1",
      }

      expect(customValidator).toHaveBeenCalledWith(mockUser, expectedContext)
      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "FORBIDDEN",
          message: "Custom validation failed",
          userMessage: "Custom error message",
          statusCode: 403,
        }),
      )
    })

    it("should use custom unauthorized error message", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(null)

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        getUserFromRequest: mockGetUser,
        customConfig: {
          unauthorizedError: {
            code: "CUSTOM_UNAUTHORIZED",
            message: "Custom unauthorized message",
            userMessage: "Custom user message",
          },
        },
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "UNAUTHORIZED",
          message: "Custom unauthorized message",
          userMessage: "Custom user message",
          statusCode: 401,
        }),
      )
    })

    it("should use custom unauthorized handler", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(null)
      const customHandler = vi.fn()

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        getUserFromRequest: mockGetUser,
        onUnauthorized: customHandler,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(customHandler).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        expect.objectContaining({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        }),
      )
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should use custom forbidden handler", async () => {
      const userWithInvalidRole = { ...mockUser, role: "guest" }
      const mockGetUser = vi.fn().mockResolvedValue(userWithInvalidRole)
      const customHandler = vi.fn()

      const config: AuthorizationConfig<string> = {
        roles: ["admin"],
        getUserFromRequest: mockGetUser,
        onForbidden: customHandler,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(customHandler).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        expect.objectContaining({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        }),
      )
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should handle errors during authorization", async () => {
      const error = new Error("Database connection failed")
      const mockGetUser = vi.fn().mockRejectedValue(error)

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        getUserFromRequest: mockGetUser,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          error: {
            name: "Error",
            message: "Database connection failed",
            stack: expect.any(String),
          },
        }),
        "Authorization middleware error",
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          component: "authorization-middleware",
        },
        extra: {
          method: "GET",
          url: "/test",
          ip: "127.0.0.1",
        },
      })

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "AUTHORIZATION_ERROR",
          message: "Authorization check failed",
          statusCode: 500,
          details: { originalError: error },
        }),
      )
    })

    it("should work without permissions requirement", async () => {
      const userWithoutPermissions = { id: "user-123", role: "user" }
      const mockGetUser = vi.fn().mockResolvedValue(userWithoutPermissions)

      const config: AuthorizationConfig<string> = {
        roles: ["user"],
        getUserFromRequest: mockGetUser,
      }

      const middleware = createAuthorizationMiddleware(config)
      await middleware(mockRequest, mockReply)

      expect(mockRequest.user).toBe(userWithoutPermissions)
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })
  })

  describe("authorize helper function", () => {
    it("should create authorization middleware with basic config", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(mockUser)

      const middleware = authorize(["user"], mockGetUser)
      await middleware(mockRequest, mockReply)

      expect(mockGetUser).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.user).toBe(mockUser)
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should create authorization middleware with permissions", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(mockUser)

      const middleware = authorize(["user"], mockGetUser, {
        permissions: ["read", "write"],
      })
      await middleware(mockRequest, mockReply)

      expect(mockRequest.user).toBe(mockUser)
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should create authorization middleware with custom messages", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(null)

      const middleware = authorize(["user"], mockGetUser, {
        customMessages: {
          unauthorized: {
            message: "Custom auth required message",
            userMessage: "Please authenticate",
          },
        },
      })
      await middleware(mockRequest, mockReply)

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "UNAUTHORIZED",
          message: "Custom auth required message",
          userMessage: "Please authenticate",
          statusCode: 401,
        }),
      )
    })

    it("should create authorization middleware with custom validator", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(mockUser)
      const customValidator = vi.fn().mockReturnValue({ authorized: true })

      const middleware = authorize(["user"], mockGetUser, {
        customValidator,
      })
      await middleware(mockRequest, mockReply)

      expect(customValidator).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          method: "GET",
          path: "/test",
          ip: "127.0.0.1",
        }),
      )
      expect(mockRequest.user).toBe(mockUser)
    })

    it("should create authorization middleware with custom handlers", async () => {
      const mockGetUser = vi.fn().mockResolvedValue(null)
      const onUnauthorized = vi.fn()

      const middleware = authorize(["user"], mockGetUser, {
        onUnauthorized,
      })
      await middleware(mockRequest, mockReply)

      expect(onUnauthorized).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        expect.objectContaining({
          code: "UNAUTHORIZED",
        }),
      )
    })

    it("should work with synchronous getUserFromRequest", async () => {
      const mockGetUser = vi.fn().mockReturnValue(mockUser)

      const middleware = authorize(["user"], mockGetUser)
      await middleware(mockRequest, mockReply)

      expect(mockGetUser).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.user).toBe(mockUser)
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })
  })
})
