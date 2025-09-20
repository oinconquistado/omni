import * as Sentry from "@sentry/node"
import type { FastifyReply, FastifyRequest } from "../types/fastify-types"
import type { MaskConfig, SanitizationConfig, SanitizationContext, SanitizationRule } from "../types/sanitization"

const CPF_REGEX = /(\d{3})(\d{3})(\d{3})(\d{2})/
const CNPJ_REGEX = /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/
const RG_REGEX = /(\d{2})(\d{3})(\d{3})(\d{1})/
const CNH_REGEX = /(\d{7})(\d{4})/
const PIS_REGEX = /(\d{3})(\d{5})(\d{2})(\d{1})/
const PHONE_LANDLINE_REGEX = /(\(\d{2}\)) (\d{4})(\d{4})/
const PHONE_MOBILE_REGEX = /(\(\d{2}\)) (\d{1})(\d{4})(\d{4})/
const CEP_REGEX = /(\d{3})(\d{2})(\d{3})/
const EMAIL_REGEX = /(.{1})(.*)(@.*)/
const BIRTH_DATE_REGEX = /(\d{2})\/(\d{2})\/(\d{4})/
const STATE_REGISTRATION_REGEX = /(\d{3})(\d{3})(\d{3})(\d{3})/
const MUNICIPAL_REGISTRATION_REGEX = /(\d{4})(\d{3})/
const SUS_CARD_REGEX = /(\d{3}) (\d{4}) (\d{4}) (\d{4})/
const VEHICLE_PLATE_REGEX = /([A-Z]{3})(\w{4})/
const VEHICLE_CHASSIS_REGEX = /(.{13})(\d{4})/
const CTPS_REGEX = /(\d{6})(\d{1}) (\d{3})(\d{1})/
const CREDIT_CARD_REGEX = /(\d{4})(\d{4})(\d{4})(\d{4})/

export class DataSanitizer {
  private config: SanitizationConfig
  private context: SanitizationContext

  constructor(config: SanitizationConfig, context: SanitizationContext = {}) {
    this.config = config
    this.context = context
  }

  private applyMask(value: string, maskConfig: MaskConfig): string {
    switch (maskConfig.type) {
      case "cpf":
        return value.replace(CPF_REGEX, "***.***.***-$4")
      case "cnpj":
        return value.replace(CNPJ_REGEX, "**.***.***/$4-$5")
      case "rg":
        return value.replace(RG_REGEX, "**.***.***-$4")
      case "cnh":
        return value.replace(CNH_REGEX, "*******$2")
      case "pis":
        return value.replace(PIS_REGEX, "***.*****.**-$4")
      case "phone-landline":
        return value.replace(PHONE_LANDLINE_REGEX, "$1 ****-$3")
      case "phone-mobile":
        return value.replace(PHONE_MOBILE_REGEX, "$1 $2****-$4")
      case "cep":
        return value.replace(CEP_REGEX, "$1**-***")
      case "email":
        return value.replace(EMAIL_REGEX, "$1***$3")
      case "birth-date":
        return value.replace(BIRTH_DATE_REGEX, "**/**/$3")
      case "state-registration":
        return value.replace(STATE_REGISTRATION_REGEX, "***.***.***.+$4")
      case "municipal-registration":
        return value.replace(MUNICIPAL_REGISTRATION_REGEX, "****$2")
      case "sus-card":
        return value.replace(SUS_CARD_REGEX, "*** **** **** $4")
      case "vehicle-plate":
        return value.replace(VEHICLE_PLATE_REGEX, "***$2")
      case "vehicle-chassis":
        return value.replace(VEHICLE_CHASSIS_REGEX, "*************$2")
      case "ctps":
        return value.replace(CTPS_REGEX, "******$2 $3-$4")
      case "credit-card":
        return value.replace(CREDIT_CARD_REGEX, "****-****-****-$4")
      case "custom":
        if (maskConfig.pattern && maskConfig.replacement) {
          const regex = new RegExp(maskConfig.pattern, "g")
          return value.replace(regex, maskConfig.replacement)
        }
        return "***"
      default:
        return "***"
    }
  }

  private shouldApplyRule(_rule: SanitizationRule): boolean {
    if (!this.context.userRole) return true

    return true
  }

  private sanitizeValue(value: unknown, rule: SanitizationRule): unknown {
    if (value === null || value === undefined) return value

    switch (rule.action) {
      case "exclude":
        return undefined
      case "mask":
        if (typeof value === "string" && rule.mask) {
          return this.applyMask(value, rule.mask)
        }
        return "***"
      case "transform":
        if (rule.transformer) {
          return rule.transformer(value)
        }
        return value
      default:
        return value
    }
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      const rule = this.config.rules.find((r) => r.field === key)

      if (rule && this.shouldApplyRule(rule)) {
        const sanitizedValue = this.sanitizeValue(value, rule)
        if (sanitizedValue !== undefined) {
          result[key] = sanitizedValue
        }
      } else if (this.config.applyToNested && value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>)
      } else if (this.config.preserveArrayStructure && Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (item && typeof item === "object") {
            return this.sanitizeObject(item as Record<string, unknown>)
          }
          return item
        })
      } else {
        result[key] = value
      }
    }

    return result
  }

  sanitize<T = unknown>(data: T): T {
    if (!data || typeof data !== "object") {
      return data
    }

    if (Array.isArray(data)) {
      if (this.config.preserveArrayStructure) {
        return data.map((item) => {
          if (item && typeof item === "object") {
            return this.sanitizeObject(item as Record<string, unknown>)
          }
          return item
        }) as T
      }
      return data
    }

    return this.sanitizeObject(data as Record<string, unknown>) as T
  }
}

export interface SanitizationMiddlewareConfig {
  getRules: (context: SanitizationContext) => SanitizationRule[]
  applyToNested?: boolean
  preserveArrayStructure?: boolean
  onError?: (error: Error, request: FastifyRequest) => void
}

export function createSanitizationMiddleware(config: SanitizationMiddlewareConfig) {
  return async (request: FastifyRequest, _reply: FastifyReply, data: unknown): Promise<unknown> => {
    try {
      const context: SanitizationContext = {
        userRole: request.user?.role as string | undefined,
        requestPath: request.url,
        method: request.method,
        customContext: {
          headers: request.headers,
          ip: request.ip,
        },
      }

      const rules = config.getRules(context)

      const sanitizationConfig: SanitizationConfig = {
        rules,
        applyToNested: config.applyToNested ?? true,
        preserveArrayStructure: config.preserveArrayStructure ?? true,
      }

      const sanitizer = new DataSanitizer(sanitizationConfig, context)
      return sanitizer.sanitize(data)
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
        "Data sanitization error",
      )

      Sentry.captureException(error, {
        tags: {
          component: "sanitization-middleware",
        },
        extra: {
          method: request.method,
          url: request.url,
          ip: request.ip,
        },
      })

      if (config.onError) {
        config.onError(error as Error, request)
      }

      return data
    }
  }
}

export interface ResponseSanitizationConfig {
  globalRules?: SanitizationRule[]
  routeSpecificRules?: Record<string, SanitizationRule[]>
  roleBasedRules?: Record<string, SanitizationRule[]>
}

export function createResponseSanitizationMiddleware(config: ResponseSanitizationConfig = {}) {
  return createSanitizationMiddleware({
    getRules: (context) => {
      const rules: SanitizationRule[] = []

      if (config.globalRules) {
        rules.push(...config.globalRules)
      }

      if (config.routeSpecificRules && context.requestPath) {
        const routeRules = config.routeSpecificRules[context.requestPath]
        if (routeRules) {
          rules.push(...routeRules)
        }
      }

      if (config.roleBasedRules && context.userRole) {
        const roleRules = config.roleBasedRules[context.userRole]
        if (roleRules) {
          rules.push(...roleRules)
        }
      }

      return rules
    },
    applyToNested: true,
    preserveArrayStructure: true,
  })
}
