// Generic Prisma client interface with common methods
export interface PrismaClientLike {
  $connect(): Promise<void>
  $disconnect(): Promise<void>
  $queryRaw(query: TemplateStringsArray, ...args: unknown[]): Promise<unknown>
  $executeRaw(query: TemplateStringsArray, ...args: unknown[]): Promise<unknown>
}

type AnyPrismaClient = PrismaClientLike

import type { PrismaSchemaConfig } from "../database/prisma-factory"
import type { LoggerConfig } from "../logger/logger-config"
import type { ResponseOrchestratorConfig } from "../middleware/response-orchestrator"
import type { SwaggerConfig } from "../plugins/swagger-plugin"
import type { SentryConfig } from "../sentry/sentry-config"

export interface DatabaseConfig {
  client?: any
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

// Fastify instance interface with essential methods
export interface FastifyInstanceLike {
  listen(opts: { port: number; host: string }): Promise<string>
  close(): Promise<void>
  ready(): any
  decorate<T = any>(name: string, value: T): void
  inject: (opts: any) => Promise<any>
  log: {
    error(message: string | Error, ...args: any[]): void
    warn(message: string, ...args: any[]): void
    info(message: string, ...args: any[]): void
    debug(message: string, ...args: any[]): void
  }
  [key: string]: any
}

export interface ServerInstance {
  start: () => Promise<void>
  stop: () => Promise<void>
  instance: FastifyInstanceLike
}
