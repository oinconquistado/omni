// Generic Prisma client interface with common methods
export interface PrismaClientLike {
  $connect(): Promise<void>
  $disconnect(): Promise<void>
  $queryRaw(query: TemplateStringsArray, ...args: unknown[]): Promise<unknown>
  $executeRaw(query: TemplateStringsArray, ...args: unknown[]): Promise<unknown>
}

import type { PrismaSchemaConfig } from "../database/prisma-factory"
import type { LoggerConfig } from "../logger/logger-config"
import type { ResponseOrchestratorConfig } from "../middleware/response-orchestrator"
import type { SwaggerConfig } from "../plugins/swagger-plugin"
import type { SentryConfig } from "../sentry/sentry-config"

export interface DatabaseConfig {
  client?: PrismaClientLike
  schema?: PrismaSchemaConfig
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

export interface AutoRouteDiscoveryConfig {
  enabled?: boolean
  apiPath?: string
  defaultMethod?: string
}

export interface UnifiedServerConfig {
  name: string
  version: string
  port: number
  host?: string
  description?: string

  api?: SimpleApiConfig
  autoPortFallback?: boolean
  autoRoutes?: AutoRouteDiscoveryConfig
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

// Fastify instance interface with essential methods
export interface InjectOptions {
  method?: string
  url: string
  headers?: Record<string, string>
  payload?: unknown
  query?: Record<string, unknown>
}

export interface InjectResponse {
  statusCode: number
  body: string
  headers: Record<string, string>
  json: () => unknown
  [key: string]: unknown
}

export interface FastifyInstanceLike {
  listen(opts: { port: number; host: string }): Promise<string>
  close(): Promise<void>
  ready(): undefined | Promise<unknown>
  decorate<T = unknown>(name: string, value: T): void
  inject: (opts: InjectOptions) => Promise<InjectResponse>
  log: {
    error(message: string | Error, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    info(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
  }
  [key: string]: unknown
}

export interface ServerInstance {
  start: () => Promise<void>
  stop: () => Promise<void>
  instance: FastifyInstanceLike
}
