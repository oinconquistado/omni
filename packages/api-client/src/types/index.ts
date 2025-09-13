// Core API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  type?: string
  operation?: string
  cacheKey?: string
  field?: string
  timestamp?: number
  requestId?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// HTTP Method Types
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

// Request Configuration
export interface RequestConfig {
  baseUrl?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
  cache?: boolean
  cacheTTL?: number
  signal?: AbortSignal
}

// Error Types
export interface ApiError extends Error {
  status?: number
  statusText?: string
  code?: string
  operation?: string
  field?: string
  data?: unknown
  requestId?: string
  timestamp?: number
}


// Cache Strategy Types
export type CacheStrategy = "cache-first" | "network-first" | "cache-only" | "network-only"

export interface CacheConfig {
  strategy: CacheStrategy
  ttl?: number
  maxAge?: number
  tags?: string[]
  invalidateOnError?: boolean
}

// Chunk/Pagination Types
export interface ChunkConfig {
  size: number
  concurrent?: number
  delay?: number
  onProgress?: (loaded: number, total: number) => void
}

// Request Context
export interface RequestContext {
  requestId: string
  timestamp: number
  abortController: AbortController
  retryCount: number
  startTime: number
}

// Client Configuration
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

// Metrics Types
export interface RequestMetrics {
  requestId: string
  method: HttpMethod
  url: string
  startTime: number
  endTime: number
  duration: number
  status?: number
  success: boolean
  cached: boolean
  retryCount: number
  error?: string
}


// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Override<T, U> = Omit<T, keyof U> & U
