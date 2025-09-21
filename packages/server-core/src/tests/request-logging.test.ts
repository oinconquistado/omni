import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerRequestLogging } from "../middleware/request-logging"

describe("Request Logging Middleware", () => {
  let mockFastify: any
  let mockRequest: any
  let mockReply: any

  const findHook = (hookName: string) => {
    return mockFastify.addHook.mock.calls.find((call: any) => call[0] === hookName)?.[1]
  }

  beforeEach(() => {
    mockRequest = {
      id: "test-request-id",
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
        warn: vi.fn(),
      },
    }

    mockReply = {
      statusCode: 200,
      elapsedTime: 150,
      header: vi.fn(),
    }

    mockFastify = {
      register: vi.fn().mockResolvedValue(undefined),
      addHook: vi.fn(),
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Positive Cases", () => {
    it("should register request context plugin", async () => {
      await registerRequestLogging(mockFastify)

      expect(mockFastify.register).toHaveBeenCalledWith(
        expect.any(Promise), // import("@fastify/request-context")
      )
    })

    it("should register all required hooks", async () => {
      await registerRequestLogging(mockFastify)

      expect(mockFastify.addHook).toHaveBeenCalledTimes(4)
      expect(mockFastify.addHook).toHaveBeenCalledWith("onRequest", expect.any(Function))
      expect(mockFastify.addHook).toHaveBeenCalledWith("onSend", expect.any(Function))
      expect(mockFastify.addHook).toHaveBeenCalledWith("onResponse", expect.any(Function))
      expect(mockFastify.addHook).toHaveBeenCalledWith("onError", expect.any(Function))
    })

    it("should log incoming requests correctly", async () => {
      await registerRequestLogging(mockFastify)
      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        await onRequestHook(mockRequest)

        expect(mockRequest.log.info).toHaveBeenCalledWith(
          {
            method: "GET",
            url: "/test",
            userAgent: "test-agent",
            ip: "127.0.0.1",
            requestId: "test-request-id",
          },
          "Incoming request",
        )
      }
    })

    it("should add request ID header", async () => {
      await registerRequestLogging(mockFastify)
      const onSendHook = findHook("onSend")

      if (onSendHook) {
        const payload = { data: "test" }
        const result = await onSendHook(mockRequest, mockReply, payload)

        expect(mockReply.header).toHaveBeenCalledWith("x-request-id", "test-request-id")
        expect(result).toBe(payload)
      }
    })

    it("should log completed requests", async () => {
      await registerRequestLogging(mockFastify)
      const onResponseHook = findHook("onResponse")

      if (onResponseHook) {
        await onResponseHook(mockRequest, mockReply)

        expect(mockRequest.log.info).toHaveBeenCalledWith(
          {
            method: "GET",
            url: "/test",
            statusCode: 200,
            responseTime: "150ms",
            requestId: "test-request-id",
          },
          "Request completed",
        )
      }
    })

    it("should log request errors", async () => {
      await registerRequestLogging(mockFastify)
      const onErrorHook = findHook("onError")

      if (onErrorHook) {
        const error = new Error("Test error")
        error.stack = "Error stack trace"

        await onErrorHook(mockRequest, mockReply, error)

        expect(mockRequest.log.error).toHaveBeenCalledWith(
          {
            method: "GET",
            url: "/test",
            error: {
              name: "Error",
              message: "Test error",
              stack: "Error stack trace",
            },
            requestId: "test-request-id",
          },
          "Request error",
        )
      }
    })

    it("should handle different HTTP methods", async () => {
      mockRequest.method = "POST"
      mockRequest.url = "/api/users"

      await registerRequestLogging(mockFastify)
      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        await onRequestHook(mockRequest)

        expect(mockRequest.log.info).toHaveBeenCalledWith(
          expect.objectContaining({
            method: "POST",
            url: "/api/users",
          }),
          "Incoming request",
        )
      }
    })

    it("should handle different status codes", async () => {
      mockReply.statusCode = 404

      await registerRequestLogging(mockFastify)
      const onResponseHook = findHook("onResponse")

      if (onResponseHook) {
        await onResponseHook(mockRequest, mockReply)

        expect(mockRequest.log.info).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
          }),
          "Request completed",
        )
      }
    })

    it("should handle payload preservation", async () => {
      await registerRequestLogging(mockFastify)
      const onSendHook = findHook("onSend")

      const testPayloads = [{ data: "test" }, "string payload", 123, null, undefined, [1, 2, 3]]

      if (onSendHook) {
        const results = await Promise.all(testPayloads.map((payload) => onSendHook(mockRequest, mockReply, payload)))

        results.forEach((result, index) => {
          expect(result).toBe(testPayloads[index])
        })
      }
    })
  })

  describe("Negative Cases", () => {
    it("should handle plugin registration failure", async () => {
      mockFastify.register.mockRejectedValue(new Error("Plugin registration failed"))

      await expect(registerRequestLogging(mockFastify)).rejects.toThrow("Plugin registration failed")
    })

    it("should handle missing request properties", async () => {
      const incompleteRequest = {
        id: "test-id",
        headers: {}, // Add empty headers object
        log: {
          info: vi.fn(),
          error: vi.fn(),
        },
      }

      await registerRequestLogging(mockFastify)
      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        await onRequestHook(incompleteRequest)

        expect(incompleteRequest.log.info).toHaveBeenCalledWith(
          {
            method: undefined,
            url: undefined,
            userAgent: undefined,
            ip: undefined,
            requestId: "test-id",
          },
          "Incoming request",
        )
      }
    })

    it("should handle missing user-agent header", async () => {
      mockRequest.headers = {}

      await registerRequestLogging(mockFastify)
      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        await onRequestHook(mockRequest)

        expect(mockRequest.log.info).toHaveBeenCalledWith(
          expect.objectContaining({
            userAgent: undefined,
          }),
          "Incoming request",
        )
      }
    })

    it("should handle errors without stack trace", async () => {
      await registerRequestLogging(mockFastify)
      const onErrorHook = findHook("onError")

      if (onErrorHook) {
        const errorWithoutStack = new Error("Test error")
        errorWithoutStack.stack = undefined

        await onErrorHook(mockRequest, mockReply, errorWithoutStack)

        expect(mockRequest.log.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              name: "Error",
              message: "Test error",
              stack: undefined,
            },
          }),
          "Request error",
        )
      }
    })

    it("should handle custom error types", async () => {
      await registerRequestLogging(mockFastify)
      const onErrorHook = findHook("onError")

      if (onErrorHook) {
        class CustomError extends Error {
          code: string
          constructor(message: string, code: string) {
            super(message)
            this.name = "CustomError"
            this.code = code
          }
        }

        const customError = new CustomError("Custom error message", "CUSTOM_CODE")
        await onErrorHook(mockRequest, mockReply, customError)

        expect(mockRequest.log.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              name: "CustomError",
              message: "Custom error message",
              stack: expect.any(String),
            },
          }),
          "Request error",
        )
      }
    })

    it("should handle reply.header method failures", async () => {
      mockReply.header.mockImplementation(() => {
        throw new Error("Header setting failed")
      })

      await registerRequestLogging(mockFastify)
      const onSendHook = findHook("onSend")

      if (onSendHook) {
        const payload = { data: "test" }
        await expect(onSendHook(mockRequest, mockReply, payload)).rejects.toThrow("Header setting failed")
      }
    })

    it("should handle addHook failures", async () => {
      mockFastify.addHook.mockImplementation(() => {
        throw new Error("Hook registration failed")
      })

      await expect(registerRequestLogging(mockFastify)).rejects.toThrow("Hook registration failed")
    })

    it("should handle edge case request IDs", async () => {
      const edgeCaseIds = ["", null, undefined, 0]
      const edgeCaseResults = ["", null, undefined, 0]

      await registerRequestLogging(mockFastify)
      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        const results = await Promise.all(
          edgeCaseIds.map(async (id) => {
            mockRequest.id = id
            mockRequest.log.info.mockClear()

            await onRequestHook(mockRequest)

            return mockRequest.log.info.mock.calls[0]?.[0]?.requestId
          }),
        )

        results.forEach((requestId, index) => {
          expect(requestId).toBe(edgeCaseResults[index])
        })
      }
    })

    it("should handle extreme response times", async () => {
      const extremeTimes = [0, -1, Infinity, NaN]
      const expectedResults = ["0ms", "-1ms", "Infinityms", "NaNms"]

      await registerRequestLogging(mockFastify)
      const onResponseHook = findHook("onResponse")

      if (onResponseHook) {
        const results = []
        
        for (let i = 0; i < extremeTimes.length; i++) {
          // Reset mocks for each test
          mockRequest.log.info.mockClear()
          mockReply.elapsedTime = extremeTimes[i]

          onResponseHook(mockRequest, mockReply)

          results.push(mockRequest.log.info.mock.calls[0]?.[0]?.responseTime)
        }

        results.forEach((responseTime, index) => {
          expect(responseTime).toBe(expectedResults[index])
        })
      }
    })

    it("should handle concurrent hook executions", async () => {
      await registerRequestLogging(mockFastify)

      const onRequestHook = findHook("onRequest")
      const onSendHook = findHook("onSend")
      const onResponseHook = findHook("onResponse")

      if (onRequestHook && onSendHook && onResponseHook) {
        const promises = [
          onRequestHook(mockRequest),
          onSendHook(mockRequest, mockReply, { data: "test" }),
          onResponseHook(mockRequest, mockReply),
        ]

        await Promise.all(promises)

        expect(mockRequest.log.info).toHaveBeenCalledTimes(2)
        expect(mockReply.header).toHaveBeenCalledWith("x-request-id", "test-request-id")
      }
    })

    it("should handle special characters in request data", async () => {
      mockRequest.url = "/test-path-with-🚀-unicode-and-special-chars!@#$%"
      mockRequest.headers["user-agent"] = "test-agent-with-special-chars: <>\"'&"

      await registerRequestLogging(mockFastify)
      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        await onRequestHook(mockRequest)

        expect(mockRequest.log.info).toHaveBeenCalledWith(
          expect.objectContaining({
            url: "/test-path-with-🚀-unicode-and-special-chars!@#$%",
            userAgent: "test-agent-with-special-chars: <>\"'&",
          }),
          "Incoming request",
        )
      }
    })

    it("should handle memory pressure scenarios", async () => {
      await registerRequestLogging(mockFastify)

      const requests = Array.from({ length: 20 }, (_, i) => ({
        ...mockRequest,
        id: `request-${i}`,
        log: {
          info: vi.fn(),
          error: vi.fn(),
        },
      }))

      const onRequestHook = findHook("onRequest")

      if (onRequestHook) {
        await Promise.all(requests.map((req) => onRequestHook(req)))

        requests.forEach((req, index) => {
          expect(req.log.info).toHaveBeenCalledWith(
            expect.objectContaining({
              requestId: `request-${index}`,
            }),
            "Incoming request",
          )
        })
      }
    })
  })
})
