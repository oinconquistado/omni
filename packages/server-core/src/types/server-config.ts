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

export interface UnifiedServerConfig {
  name: string
  version: string
  port: number
  host?: string
  description?: string

  logger?: LoggerConfig
  sentry?: SentryConfig
  swagger?: SwaggerConfig | boolean
  database?: DatabaseConfig
  health?: HealthConfig
  api?: ApiConfig
  responseOrchestrator?: ResponseOrchestratorConfig

  enableSentryDebugRoute?: boolean
  enableRequestLogging?: boolean
}

export interface ServerInstance {
  start: () => Promise<void>
  stop: () => Promise<void>
  instance: any
}
