import type { DatabaseConnection } from "../database/prisma-utils"
import type { AuthorizationConfig } from "./authorization"
import type { FastifyRequest } from "./fastify-types"
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
  db: any // Will be the Prisma client from DatabaseConnection
  log: FastifyRequest["log"]
  user?: any
}

export type ControllerHandler<TInput = any, TOutput = any> = (
  input: TInput,
  context: ControllerContext,
) => Promise<TOutput> | TOutput

export interface DeclarativeFrameworkOptions {
  routesPath: string
  database: DatabaseConnection
}
