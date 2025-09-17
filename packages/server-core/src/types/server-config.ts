// Using any to maintain compatibility with different Prisma clients
type AnyPrismaClient = any

import type { LoggerConfig } from "../logger/logger-config"
import type { ResponseOrchestratorConfig } from "../middleware/response-orchestrator"
import type { SwaggerConfig } from "../plugins/swagger-plugin"
import type { SentryConfig } from "../sentry/sentry-config"

export interface DatabaseConfig {
  client: AnyPrismaClient
  healthCheck?: () => Promise<{ status: string; details?: Record<string, unknown> }>
}

export interface ApiConfig {
  name: string
  version: string
  description?: string
}

export interface HealthConfig {
  enabled?: boolean
  checkDatabase?: () => Promise<{ status: string; details?: Record<string, unknown> }>
  customChecks?: Record<string, () => Promise<{ status: string; details?: Record<string, unknown> }>>
}

export type SimpleHealthConfig = { enabled?: boolean } | HealthConfig
export type SimpleApiConfig = { enabled?: boolean } | (Partial<ApiConfig> & { description?: string; enabled?: boolean })
export type SimpleSwaggerConfig = { enabled?: boolean } | (SwaggerConfig & { enabled?: boolean })

export interface UnifiedServerConfig {
  name: string
  version: string
  port: number
  host?: string
  description?: string

  api?: SimpleApiConfig
  autoPortFallback?: boolean
  database?: DatabaseConfig
  enableRequestLogging?: boolean
  enableSentryDebugRoute?: boolean
  health?: SimpleHealthConfig
  logger?: LoggerConfig
  maxPortRetries?: number
  responseOrchestrator?: ResponseOrchestratorConfig
  sentry?: SentryConfig
  swagger?: SimpleSwaggerConfig
}

export interface ServerInstance {
  start: () => Promise<void>
  stop: () => Promise<void>
  instance: any
}
