import * as Sentry from "@sentry/node"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createResponseOrchestrator, ResponseOrchestrator } from "../middleware/response-orchestrator"

// Mock Sentry
vi.mock("@sentry/node", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}))

// Mock sanitization middleware
vi.mock("../middleware/sanitization", () => ({
  createResponseSanitizationMiddleware: vi.fn(() => vi.fn((_request, _reply, data) => data)),
}))

describe("Response Orchestrator", () => {
  let mockRequest: any
  let mockReply: any
  let orchestrator: ResponseOrchestrator

  beforeEach(() => {
    mockRequest = {
      id: "test-request-id",
      method: "GET",
      url: "/test",
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    orchestrator = new ResponseOrchestrator()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("constructor", () => {
    it("should create orchestrator with default config", () => {
      const defaultOrchestrator = new ResponseOrchestrator()
      expect(defaultOrchestrator).toBeInstanceOf(ResponseOrchestrator)
    })

    it("should create orchestrator with custom config", () => {
      const customOrchestrator = new ResponseOrchestrator({
        includeRequestId: false,
        includeTimestamp: false,
        logResponses: false,
        sentryIntegration: false,
      })
      expect(customOrchestrator).toBeInstanceOf(ResponseOrchestrator)
    })

    it("should initialize sanitization middleware when provided", () => {
      const orchestratorWithSanitization = new ResponseOrchestrator({
        sanitization: {
          globalRules: [],
        },
      })
      expect(orchestratorWithSanitization).toBeInstanceOf(ResponseOrchestrator)
    })
  })

  describe("success", () => {
    it("should send successful response with default status code", () => {
      const responseData = {
        data: { message: "Success" },
      }

      orchestrator.success(mockReply, mockRequest, responseData)

      expect(mockReply.status).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: { message: "Success" },
        timestamp: expect.any(Number),
        requestId: "test-request-id",
        meta: undefined,
      })
    })

    it("should send successful response with custom status code", () => {
      const responseData = {
        data: { id: 1, name: "Created" },
      }

      orchestrator.success(mockReply, mockRequest, responseData, 201)

      expect(mockReply.status).toHaveBeenCalledWith(201)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: "Created" },
        timestamp: expect.any(Number),
        requestId: "test-request-id",
        meta: undefined,
      })
    })

    it("should include metadata when provided", () => {
      const responseData = {
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      orchestrator.success(mockReply, mockRequest, responseData)

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        timestamp: expect.any(Number),
        requestId: "test-request-id",
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
    })

    it("should log response when logging is enabled", () => {
      const responseData = { data: "test" }

      orchestrator.success(mockReply, mockRequest, responseData)

      expect(mockRequest.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          statusCode: 200,
          responseDataType: "string",
          hasMetadata: false,
          requestId: "test-request-id",
        }),
        "Successful response sent",
      )
    })

    it("should exclude timestamp when disabled", () => {
      const orchestratorNoTimestamp = new ResponseOrchestrator({
        includeTimestamp: false,
      })

      const responseData = { data: "test" }

      orchestratorNoTimestamp.success(mockReply, mockRequest, responseData)

      const sentResponse = mockReply.send.mock.calls[0][0]
      expect(sentResponse.timestamp).toBeUndefined()
    })

    it("should exclude requestId when disabled", () => {
      const orchestratorNoRequestId = new ResponseOrchestrator({
        includeRequestId: false,
      })

      const responseData = { data: "test" }

      orchestratorNoRequestId.success(mockReply, mockRequest, responseData)

      const sentResponse = mockReply.send.mock.calls[0][0]
      expect(sentResponse.requestId).toBeUndefined()
    })
  })

  describe("error", () => {
    it("should send error response with default status code", () => {
      const errorData = {
        code: "TEST_ERROR",
        message: "Test error message",
      }

      orchestrator.error(mockReply, mockRequest, errorData)

      expect(mockReply.status).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "TEST_ERROR",
          message: "Test error message",
          userMessage: undefined,
          details: undefined,
        },
        timestamp: expect.any(Number),
        requestId: "test-request-id",
      })
    })

    it("should send error response with custom status code from parameter", () => {
      const errorData = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      }

      orchestrator.error(mockReply, mockRequest, errorData, 400)

      expect(mockReply.status).toHaveBeenCalledWith(400)
    })

    it("should send error response with status code from error data", () => {
      const errorData = {
        code: "NOT_FOUND",
        message: "Resource not found",
        statusCode: 404,
      }

      orchestrator.error(mockReply, mockRequest, errorData)

      expect(mockReply.status).toHaveBeenCalledWith(404)
    })

    it("should include user message and details", () => {
      const errorData = {
        code: "CUSTOM_ERROR",
        message: "Internal error message",
        userMessage: "Something went wrong. Please try again.",
        details: { field: "value", context: "additional info" },
      }

      orchestrator.error(mockReply, mockRequest, errorData, 422)

      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "CUSTOM_ERROR",
          message: "Internal error message",
          userMessage: "Something went wrong. Please try again.",
          details: { field: "value", context: "additional info" },
        },
        timestamp: expect.any(Number),
        requestId: "test-request-id",
      })
    })

    it("should log error with correct level for 4xx errors", () => {
      const errorData = {
        code: "CLIENT_ERROR",
        message: "Client error",
      }

      orchestrator.error(mockReply, mockRequest, errorData, 400)

      expect(mockRequest.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          statusCode: 400,
          errorCode: "CLIENT_ERROR",
          errorMessage: "Client error",
          requestId: "test-request-id",
        }),
        "Error response sent",
      )
    })

    it("should log error with correct level for 5xx errors", () => {
      const errorData = {
        code: "SERVER_ERROR",
        message: "Server error",
      }

      orchestrator.error(mockReply, mockRequest, errorData, 500)

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          statusCode: 500,
          errorCode: "SERVER_ERROR",
          errorMessage: "Server error",
          requestId: "test-request-id",
        }),
        "Error response sent",
      )
    })

    it("should integrate with Sentry for 5xx errors", () => {
      const errorData = {
        code: "SERVER_ERROR",
        message: "Server error",
      }

      orchestrator.error(mockReply, mockRequest, errorData, 500)

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: "Server error response",
        level: "error",
        data: {
          method: "GET",
          url: "/test",
          statusCode: 500,
          errorCode: "SERVER_ERROR",
          errorMessage: "Server error",
          requestId: "test-request-id",
        },
      })
    })

    it("should capture original error in Sentry when available", () => {
      const originalError = new Error("Original error")
      const errorData = {
        code: "SERVER_ERROR",
        message: "Server error",
        details: { originalError },
      }

      orchestrator.error(mockReply, mockRequest, errorData, 500)

      expect(Sentry.captureException).toHaveBeenCalledWith(originalError)
    })

    it("should not integrate with Sentry when disabled", () => {
      const orchestratorNoSentry = new ResponseOrchestrator({
        sentryIntegration: false,
      })

      const errorData = {
        code: "SERVER_ERROR",
        message: "Server error",
      }

      orchestratorNoSentry.error(mockReply, mockRequest, errorData, 500)

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled()
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })

  describe("sendSuccess", () => {
    it("should send success response with data", async () => {
      const data = { message: "Success" }

      await orchestrator.sendSuccess(mockReply, mockRequest, data)

      expect(mockReply.status).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: { message: "Success" },
        timestamp: expect.any(Number),
        requestId: "test-request-id",
        meta: undefined,
      })
    })

    it("should send success response with custom options", async () => {
      const data = { id: 1 }
      const options = {
        statusCode: 201,
        message: "Created successfully",
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      await orchestrator.sendSuccess(mockReply, mockRequest, data, options)

      expect(mockReply.status).toHaveBeenCalledWith(201)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
        timestamp: expect.any(Number),
        requestId: "test-request-id",
        meta: options.meta,
      })
    })
  })

  describe("sendPaginated", () => {
    it("should send paginated response", async () => {
      const data = [{ id: 1 }, { id: 2 }]
      const meta = {
        page: 1,
        limit: 2,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }

      await orchestrator.sendPaginated(mockReply, mockRequest, data, meta)

      expect(mockReply.status).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        timestamp: expect.any(Number),
        requestId: "test-request-id",
        meta,
      })
    })

    it("should send paginated response with custom status code", async () => {
      const data: any[] = []
      const meta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      }

      await orchestrator.sendPaginated(mockReply, mockRequest, data, meta, {
        statusCode: 204,
      })

      expect(mockReply.status).toHaveBeenCalledWith(204)
    })
  })

  describe("createResponseOrchestrator", () => {
    it("should create a new ResponseOrchestrator instance", () => {
      const orchestrator = createResponseOrchestrator()
      expect(orchestrator).toBeInstanceOf(ResponseOrchestrator)
    })

    it("should create orchestrator with custom config", () => {
      const config = {
        includeRequestId: false,
        logResponses: false,
      }

      const orchestrator = createResponseOrchestrator(config)
      expect(orchestrator).toBeInstanceOf(ResponseOrchestrator)
    })
  })
})
