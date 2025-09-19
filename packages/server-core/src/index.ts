export type { PrismaClientConfig, PrismaSchemaConfig } from "./database/prisma-factory"
export { createPrismaClientFromSchema } from "./database/prisma-factory"
export type { DatabaseConnection } from "./database/prisma-utils"
export { checkDatabaseHealth } from "./database/prisma-utils"
export type { LoggerConfig } from "./logger/logger-config"
export { createFastifyLogger, createLogger } from "./logger/logger-config"
export { authorize, createAuthorizationMiddleware } from "./middleware/authorization"
export { registerRequestLogging } from "./middleware/request-logging"
export type {
  ErrorResponseData,
  ResponseOrchestratorConfig,
  SuccessResponseData,
} from "./middleware/response-orchestrator"
export {
  createResponseOrchestrator,
  defaultResponseOrchestrator,
  ResponseOrchestrator,
  responseOrchestrator,
} from "./middleware/response-orchestrator"
export {
  createResponseSanitizationMiddleware,
  createSanitizationMiddleware,
  DataSanitizer,
} from "./middleware/sanitization"
export { createValidationMiddleware, validate } from "./middleware/validation"
export type { SwaggerConfig } from "./plugins/swagger-plugin"
export { registerSwagger } from "./plugins/swagger-plugin"
export type { ApiInfo } from "./routes/api-routes"
export { registerApiRoutes } from "./routes/api-routes"
export { registerDeclarativeRoutes } from "./routes/declarative-routes"
export type { DatabaseHealthData, HealthData } from "./routes/health-routes"
export { registerHealthRoutes } from "./routes/health-routes"
export type { RouteRegistrator } from "./routes/route-registry"
export { registerRoutes } from "./routes/route-registry"
export { logTestExecution, registerSentryDebugRoute, registerSentryErrorHandler } from "./sentry/fastify-sentry"
export type { SentryConfig } from "./sentry/sentry-config"
export { initializeSentry, isSentryInitialized, Sentry } from "./sentry/sentry-config"
export type { ServerConfig } from "./server/create-server"
export { createServer } from "./server/create-server"
export { configureServer, startServer as startUnifiedServer } from "./server/unified-server"
export type {
  AuthorizationConfig,
  AuthorizationContext,
  AuthorizationError,
  AuthorizationResult,
  AuthorizedUser,
  CustomAuthorizationConfig,
} from "./types/authorization"
export type {
  ControllerContext,
  ControllerHandler,
  DeclarativeFrameworkOptions,
  HttpMethod,
  ModuleConfig,
  RouteConfig,
} from "./types/declarative-routes"
export type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RouteHandler,
  RouteHandlerMethod,
  RouteOptions,
  ZodFastifyInstance,
} from "./types/fastify-types"
export type {
  ApiResponse,
  BaseResponse,
  ErrorResponse,
  PaginationMeta,
  ResponseData,
  ResponseError,
  SuccessResponse,
} from "./types/response"
export type {
  MaskConfig,
  MaskType,
  SanitizationConfig,
  SanitizationContext,
  SanitizationRule,
} from "./types/sanitization"
export type {
  ApiConfig,
  DatabaseConfig,
  HealthConfig,
  ServerInstance,
  SimpleApiConfig,
  SimpleHealthConfig,
  SimpleSwaggerConfig,
  UnifiedServerConfig,
} from "./types/server-config"
export type {
  ValidatedRequest,
  ValidationErrors,
  ValidationMiddlewareConfig,
  ValidationOptions,
  ValidationSchemas,
} from "./types/validation"
export type { StartServerConfig } from "./utils/start-server"
export { startServer } from "./utils/start-server"
export { createTypedRoute, createValidationSchemas, type InferRouteTypes } from "./utils/zod-validation"
