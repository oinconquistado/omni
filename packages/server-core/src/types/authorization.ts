import type { FastifyReply, FastifyRequest } from "./fastify-types"

export interface AuthorizedUser<TRole = string> {
  id: string | number
  role: TRole
  permissions?: string[]
  metadata?: Record<string, unknown>
}

export interface AuthorizationError {
  code: string
  message: string
  userMessage?: string
  details?: Record<string, unknown>
}

export interface AuthorizationResult {
  authorized: boolean
  error?: AuthorizationError
  user?: AuthorizedUser
}

export interface CustomAuthorizationConfig<TRole = string> {
  unauthorizedError?: AuthorizationError
  forbiddenError?: AuthorizationError
  customValidator?: (user: AuthorizedUser<TRole>, context: AuthorizationContext) => AuthorizationResult
}

export interface AuthorizationContext {
  method: string
  path: string
  headers: Record<string, string | string[]>
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  ip: string
}

export interface AuthorizationConfig<TRole = string> {
  roles: TRole[]
  permissions?: string[]
  getUserFromRequest: (request: FastifyRequest) => Promise<AuthorizedUser<TRole> | null> | AuthorizedUser<TRole> | null
  onUnauthorized?: (request: FastifyRequest, reply: FastifyReply, error: AuthorizationError) => Promise<void> | void
  onForbidden?: (request: FastifyRequest, reply: FastifyReply, error: AuthorizationError) => Promise<void> | void
  customConfig?: CustomAuthorizationConfig<TRole>
}
