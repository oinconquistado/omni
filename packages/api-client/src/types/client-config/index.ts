import type { ApiError } from "@repo/shared-types"
import type { RequestConfig } from "@/types/request-config/index.js"
import type { CacheStrategy } from "@/types/cache-strategy/index.js"
import type { RequestContext } from "@/types/request-context/index.js"

export interface ApiClientConfig extends RequestConfig {
  name?: string
  version?: string
  defaultCacheStrategy?: CacheStrategy
  enableMetrics?: boolean
  enableLogging?: boolean
  logLevel?: "error" | "warn" | "info" | "debug"
  interceptors?: {
    request?: ((config: RequestConfig, context: RequestContext) => RequestConfig | Promise<RequestConfig>)[]
    response?: ((response: unknown, context: RequestContext) => unknown | Promise<unknown>)[]
    error?: ((error: ApiError, context: RequestContext) => ApiError | Promise<ApiError>)[]
  }
}
