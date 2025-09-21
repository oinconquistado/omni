import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { responseOrchestrator } from "../middleware/response-orchestrator"
import { createValidationMiddleware, validate } from "../middleware/validation"

// Mock the response orchestrator
vi.mock("../middleware/response-orchestrator", () => ({
  responseOrchestrator: {
    error: vi.fn(),
  },
}))

describe("Validation Middleware", () => {
  let mockRequest: any
  let mockReply: any

  beforeEach(() => {
    mockRequest = {
      body: undefined,
      query: undefined,
      params: undefined,
      headers: undefined,
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    vi.clearAllMocks()
  })

  describe("createValidationMiddleware", () => {
    it("should validate body successfully", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      })

      const middleware = createValidationMiddleware({
        schemas: { body: bodySchema },
      })

      mockRequest.body = {
        email: "test@example.com",
        name: "John Doe",
      }

      await middleware(mockRequest, mockReply)

      expect(mockRequest.validatedBody).toEqual({
        email: "test@example.com",
        name: "John Doe",
      })
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should handle body validation errors", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      })

      const middleware = createValidationMiddleware({
        schemas: { body: bodySchema },
      })

      mockRequest.body = {
        email: "invalid-email",
        name: "",
      }

      await middleware(mockRequest, mockReply)

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          statusCode: 400,
          details: {
            validationErrors: {
              body: expect.arrayContaining([expect.stringContaining("email"), expect.stringContaining("name")]),
            },
          },
        }),
      )
    })

    it("should validate query parameters successfully", async () => {
      const querySchema = z.object({
        page: z.string().transform(Number).pipe(z.number().min(1)),
        limit: z.string().transform(Number).pipe(z.number().max(100)),
      })

      const middleware = createValidationMiddleware({
        schemas: { query: querySchema },
      })

      mockRequest.query = {
        page: "1",
        limit: "10",
      }

      await middleware(mockRequest, mockReply)

      expect(mockRequest.validatedQuery).toEqual({
        page: 1,
        limit: 10,
      })
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should validate params successfully", async () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        slug: z.string().min(1),
      })

      const middleware = createValidationMiddleware({
        schemas: { params: paramsSchema },
      })

      mockRequest.params = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        slug: "test-slug",
      }

      await middleware(mockRequest, mockReply)

      expect(mockRequest.validatedParams).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
        slug: "test-slug",
      })
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should validate headers successfully", async () => {
      const headersSchema = z.object({
        authorization: z.string().startsWith("Bearer "),
        "content-type": z.string().optional(),
      })

      const middleware = createValidationMiddleware({
        schemas: { headers: headersSchema },
      })

      mockRequest.headers = {
        authorization: "Bearer token123",
        "content-type": "application/json",
      }

      await middleware(mockRequest, mockReply)

      expect(mockRequest.validatedHeaders).toEqual({
        authorization: "Bearer token123",
        "content-type": "application/json",
      })
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should handle custom error handler", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
      })

      const customErrorHandler = vi.fn()

      const middleware = createValidationMiddleware({
        schemas: { body: bodySchema },
        options: {
          onValidationError: customErrorHandler,
        },
      })

      mockRequest.body = {
        email: "invalid-email",
      }

      await middleware(mockRequest, mockReply)

      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.arrayContaining([expect.stringContaining("email")]),
        }),
        mockRequest,
        mockReply,
      )
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should handle custom error messages", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
      })

      const middleware = createValidationMiddleware({
        schemas: { body: bodySchema },
        options: {
          customErrorMessages: {
            validation: "Custom validation error message",
          },
        },
      })

      mockRequest.body = {
        email: "invalid-email",
      }

      await middleware(mockRequest, mockReply)

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          message: "Custom validation error message",
        }),
      )
    })

    it("should handle multiple validation errors", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
      })

      const querySchema = z.object({
        page: z.string().transform(Number).pipe(z.number().min(1)),
      })

      const middleware = createValidationMiddleware({
        schemas: {
          body: bodySchema,
          query: querySchema,
        },
      })

      mockRequest.body = {
        email: "invalid-email",
      }
      mockRequest.query = {
        page: "0",
      }

      await middleware(mockRequest, mockReply)

      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          details: {
            validationErrors: {
              body: expect.any(Array),
              query: expect.any(Array),
            },
          },
        }),
      )
    })

    it("should handle custom error handler throwing error", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
      })

      const customErrorHandler = vi.fn().mockImplementation(() => {
        throw new Error("Custom handler failed")
      })

      const middleware = createValidationMiddleware({
        schemas: { body: bodySchema },
        options: {
          onValidationError: customErrorHandler,
        },
      })

      mockRequest.body = {
        email: "invalid-email",
      }

      await middleware(mockRequest, mockReply)

      expect(customErrorHandler).toHaveBeenCalled()

      // Should catch the error from custom handler and call response orchestrator
      expect(responseOrchestrator.error).toHaveBeenCalledWith(
        mockReply,
        mockRequest,
        expect.objectContaining({
          code: "VALIDATION_INTERNAL_ERROR",
          message: "Internal validation error",
          statusCode: 500,
        }),
      )
    })
  })

  describe("validate function", () => {
    it("should create validation middleware with schemas only", async () => {
      const bodySchema = z.object({
        name: z.string(),
      })

      const middleware = validate({ body: bodySchema })

      mockRequest.body = { name: "Test" }

      await middleware(mockRequest, mockReply)

      expect(mockRequest.validatedBody).toEqual({ name: "Test" })
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })

    it("should create validation middleware with schemas and options", async () => {
      const bodySchema = z.object({
        email: z.string().email(),
      })

      const customErrorHandler = vi.fn()

      const middleware = validate({ body: bodySchema }, { onValidationError: customErrorHandler })

      mockRequest.body = { email: "invalid-email" }

      await middleware(mockRequest, mockReply)

      expect(customErrorHandler).toHaveBeenCalled()
      expect(responseOrchestrator.error).not.toHaveBeenCalled()
    })
  })
})
