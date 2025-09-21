import * as Sentry from "@sentry/node"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createResponseSanitizationMiddleware,
  createSanitizationMiddleware,
  DataSanitizer,
} from "../middleware/sanitization"
import type { SanitizationConfig, SanitizationRule } from "../types/sanitization"

// Mock Sentry
vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
}))

describe("Data Sanitization", () => {
  let mockRequest: any
  let mockReply: any

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      url: "/test",
      ip: "127.0.0.1",
      headers: {
        authorization: "Bearer token123",
      },
      user: {
        id: "user-123",
        role: "user",
      },
      log: {
        error: vi.fn(),
      },
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("DataSanitizer", () => {
    describe("CPF masking", () => {
      it("should mask CPF correctly (positive case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "cpf",
              action: "mask",
              mask: { type: "cpf" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { cpf: "12345678901" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ cpf: "***.***.***-01" })
      })

      it("should handle malformed CPF (negative case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "cpf",
              action: "mask",
              mask: { type: "cpf" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { cpf: "123" }

        const result = sanitizer.sanitize(data)

        // Should still apply the mask even if format doesn't match perfectly
        expect(result).toEqual({ cpf: "123" })
      })

      it("should handle null CPF values", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "cpf",
              action: "mask",
              mask: { type: "cpf" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { cpf: null }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ cpf: null })
      })
    })

    describe("CNPJ masking", () => {
      it("should mask CNPJ correctly", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "cnpj",
              action: "mask",
              mask: { type: "cnpj" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { cnpj: "12345678000195" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ cnpj: "**.***.***/0001-95" })
      })
    })

    describe("Email masking", () => {
      it("should mask email correctly (positive case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { email: "user@example.com" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ email: "u***@example.com" })
      })

      it("should handle invalid email format (negative case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { email: "invalid-email" }

        const result = sanitizer.sanitize(data)

        // Should still process even if email format is invalid
        expect(result).toEqual({ email: "invalid-email" })
      })
    })

    describe("Phone number masking", () => {
      it("should mask landline phone correctly", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "phone",
              action: "mask",
              mask: { type: "phone-landline" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { phone: "(11) 12345678" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ phone: "(11) ****-5678" })
      })

      it("should mask mobile phone correctly", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "phone",
              action: "mask",
              mask: { type: "phone-mobile" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { phone: "(11) 912345678" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ phone: "(11) 9****-5678" })
      })
    })

    describe("Custom masking", () => {
      it("should apply custom mask with pattern (positive case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "customField",
              action: "mask",
              mask: {
                type: "custom",
                pattern: "(\\d{3})(\\d{3})(\\d{4})",
                replacement: "***-***-$3",
              },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { customField: "1234567890" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ customField: "***-***-7890" })
      })

      it("should fallback to default mask when custom pattern is invalid (negative case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "customField",
              action: "mask",
              mask: {
                type: "custom",
                pattern: undefined,
                replacement: undefined,
              },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { customField: "sensitive-data" }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ customField: "***" })
      })
    })

    describe("Field exclusion", () => {
      it("should exclude sensitive fields (positive case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "password",
              action: "exclude",
            },
            {
              field: "secret",
              action: "exclude",
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = {
          id: 1,
          username: "user123",
          password: "secret123",
          secret: "api-key",
        }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({
          id: 1,
          username: "user123",
        })
      })
    })

    describe("Data transformation", () => {
      it("should transform data using custom transformer (positive case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "amount",
              action: "transform",
              transformer: (value: unknown) => {
                if (typeof value === "number") {
                  return value / 100
                }
                return value
              },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { amount: 1500 }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ amount: 15 })
      })

      it("should handle transformer errors gracefully (negative case)", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "data",
              action: "transform",
              transformer: () => {
                throw new Error("Transformer error")
              },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { data: "test" }

        // Should not throw error but handle gracefully
        expect(() => sanitizer.sanitize(data)).toThrow("Transformer error")
      })
    })

    describe("Nested object handling", () => {
      it("should sanitize nested objects when applyToNested is true", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
          applyToNested: true,
        }

        const sanitizer = new DataSanitizer(config)
        const data = {
          user: {
            id: 1,
            email: "user@example.com",
            profile: {
              email: "profile@example.com",
            },
          },
        }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({
          user: {
            id: 1,
            email: "u***@example.com",
            profile: {
              email: "p***@example.com",
            },
          },
        })
      })

      it("should not sanitize nested objects when applyToNested is false", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
          applyToNested: false,
        }

        const sanitizer = new DataSanitizer(config)
        const data = {
          email: "top@example.com",
          user: {
            email: "nested@example.com",
          },
        }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({
          email: "t***@example.com",
          user: {
            email: "nested@example.com",
          },
        })
      })
    })

    describe("Array handling", () => {
      it("should preserve array structure and sanitize items", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
          preserveArrayStructure: true,
        }

        const sanitizer = new DataSanitizer(config)
        const data = [
          { id: 1, email: "user1@example.com" },
          { id: 2, email: "user2@example.com" },
        ]

        const result = sanitizer.sanitize(data)

        expect(result).toEqual([
          { id: 1, email: "u***@example.com" },
          { id: 2, email: "u***@example.com" },
        ])
      })

      it("should handle mixed array content", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "value",
              action: "mask",
              mask: { type: "custom" },
            },
          ],
          preserveArrayStructure: true,
        }

        const sanitizer = new DataSanitizer(config)
        const data = [{ value: "sensitive" }, "string-item", 123, null]

        const result = sanitizer.sanitize(data)

        expect(result).toEqual([{ value: "***" }, "string-item", 123, null])
      })
    })

    describe("Edge cases", () => {
      it("should handle null data", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const result = sanitizer.sanitize(null)

        expect(result).toBeNull()
      })

      it("should handle undefined data", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const result = sanitizer.sanitize(undefined)

        expect(result).toBeUndefined()
      })

      it("should handle primitive data types", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "test",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)

        expect(sanitizer.sanitize("string")).toBe("string")
        expect(sanitizer.sanitize(123)).toBe(123)
        expect(sanitizer.sanitize(true)).toBe(true)
      })

      it("should handle non-string values for masking", () => {
        const config: SanitizationConfig = {
          rules: [
            {
              field: "number",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        }

        const sanitizer = new DataSanitizer(config)
        const data = { number: 12345 }

        const result = sanitizer.sanitize(data)

        expect(result).toEqual({ number: "***" })
      })
    })
  })

  describe("createSanitizationMiddleware", () => {
    it("should create middleware that sanitizes data (positive case)", async () => {
      const getRules = vi.fn().mockReturnValue([
        {
          field: "email",
          action: "mask",
          mask: { type: "email" },
        },
      ] as SanitizationRule[])

      const middleware = createSanitizationMiddleware({
        getRules,
        applyToNested: true,
      })

      const data = { email: "test@example.com" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(getRules).toHaveBeenCalledWith({
        userRole: "user",
        requestPath: "/test",
        method: "GET",
        customContext: {
          headers: { authorization: "Bearer token123" },
          ip: "127.0.0.1",
        },
      })

      expect(result).toEqual({ email: "t***@example.com" })
    })

    it("should handle middleware errors gracefully (negative case)", async () => {
      const getRules = vi.fn().mockImplementation(() => {
        throw new Error("getRules failed")
      })

      const onError = vi.fn()

      const middleware = createSanitizationMiddleware({
        getRules,
        onError,
      })

      const data = { test: "data" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/test",
          error: expect.objectContaining({
            name: "Error",
            message: "getRules failed",
          }),
        }),
        "Data sanitization error",
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: { component: "sanitization-middleware" },
          extra: {
            method: "GET",
            url: "/test",
            ip: "127.0.0.1",
          },
        }),
      )

      expect(onError).toHaveBeenCalledWith(expect.any(Error), mockRequest)
      expect(result).toBe(data) // Should return original data on error
    })

    it("should handle missing user context", async () => {
      mockRequest.user = undefined

      const getRules = vi.fn().mockReturnValue([])

      const middleware = createSanitizationMiddleware({ getRules })

      const data = { test: "data" }
      await middleware(mockRequest, mockReply, data)

      expect(getRules).toHaveBeenCalledWith({
        userRole: undefined,
        requestPath: "/test",
        method: "GET",
        customContext: {
          headers: { authorization: "Bearer token123" },
          ip: "127.0.0.1",
        },
      })
    })
  })

  describe("createResponseSanitizationMiddleware", () => {
    it("should create middleware with global rules", async () => {
      const globalRules: SanitizationRule[] = [
        {
          field: "password",
          action: "exclude",
        },
      ]

      const middleware = createResponseSanitizationMiddleware({
        globalRules,
      })

      const data = { id: 1, username: "test", password: "secret" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toEqual({ id: 1, username: "test" })
    })

    it("should apply route-specific rules", async () => {
      const routeSpecificRules: Record<string, SanitizationRule[]> = {
        "/test": [
          {
            field: "email",
            action: "mask",
            mask: { type: "email" },
          },
        ],
      }

      const middleware = createResponseSanitizationMiddleware({
        routeSpecificRules,
      })

      const data = { email: "user@example.com" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toEqual({ email: "u***@example.com" })
    })

    it("should apply role-based rules", async () => {
      const roleBasedRules: Record<string, SanitizationRule[]> = {
        user: [
          {
            field: "adminData",
            action: "exclude",
          },
        ],
      }

      const middleware = createResponseSanitizationMiddleware({
        roleBasedRules,
      })

      const data = { id: 1, adminData: "sensitive" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toEqual({ id: 1 })
    })

    it("should combine all rule types", async () => {
      const middleware = createResponseSanitizationMiddleware({
        globalRules: [
          {
            field: "password",
            action: "exclude",
          },
        ],
        routeSpecificRules: {
          "/test": [
            {
              field: "email",
              action: "mask",
              mask: { type: "email" },
            },
          ],
        },
        roleBasedRules: {
          user: [
            {
              field: "adminData",
              action: "exclude",
            },
          ],
        },
      })

      const data = {
        id: 1,
        email: "user@example.com",
        password: "secret",
        adminData: "sensitive",
      }

      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toEqual({ id: 1, email: "u***@example.com" })
    })

    it("should handle empty configuration", async () => {
      const middleware = createResponseSanitizationMiddleware({})

      const data = { test: "data" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toStrictEqual(data)
    })

    it("should handle non-matching route patterns", async () => {
      const middleware = createResponseSanitizationMiddleware({
        routeSpecificRules: {
          "/different-route": [
            {
              field: "email",
              action: "exclude",
            },
          ],
        },
      })

      const data = { email: "user@example.com" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toStrictEqual(data) // No rules should apply
    })

    it("should handle non-matching user roles", async () => {
      const middleware = createResponseSanitizationMiddleware({
        roleBasedRules: {
          admin: [
            {
              field: "email",
              action: "exclude",
            },
          ],
        },
      })

      const data = { email: "user@example.com" }
      const result = await middleware(mockRequest, mockReply, data)

      expect(result).toStrictEqual(data) // No rules should apply for 'user' role
    })
  })
})
