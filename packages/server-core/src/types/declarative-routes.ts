import type { AuthorizationConfig } from "./authorization"
import type { FastifyRequest } from "./fastify-types"
import type { PrismaClientLike } from "./server-config"
import type { ValidationSchemas } from "./validation"

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

export interface RouteConfig {
  method: HttpMethod
  controller: string
  validation?: ValidationSchemas
  authorization?: AuthorizationConfig
  paginated?: boolean
}

export interface ModuleConfig {
  routes: Record<string, RouteConfig>
}

export interface ControllerContext {
  db?: PrismaClientLike
  log: FastifyRequest["log"]
  user?: Record<string, unknown>
}

export type ControllerHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ControllerContext,
) => Promise<TOutput> | TOutput

export interface DatabaseConnectionLike {
  client: PrismaClientLike
}

export interface DeclarativeFrameworkOptions {
  routesPath: string
  controllersPath?: string // Optional, defaults to replacing 'routes' with 'controllers' in routesPath
  database: DatabaseConnectionLike
}
