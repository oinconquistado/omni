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
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

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

// Query Configuration
export interface QueryConfig<TData = unknown, TError = ApiError> {
  enabled?: boolean
  retry?: number | boolean | ((failureCount: number, error: TError) => boolean)
  retryDelay?: number | ((retryAttempt: number, error: TError) => number)
  staleTime?: number
  cacheTime?: number
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean | 'always'
  refetchOnReconnect?: boolean | 'always'
  refetchInterval?: number | false
  refetchIntervalInBackground?: boolean
  select?: (data: TData) => unknown
  suspense?: boolean
  useErrorBoundary?: boolean | ((error: TError) => boolean)
  onSuccess?: (data: TData) => void
  onError?: (error: TError) => void
  onSettled?: (data: TData | undefined, error: TError | null) => void
  meta?: Record<string, unknown>
}

// Mutation Configuration
export interface MutationConfig<TData = unknown, TError = ApiError, TVariables = unknown> {
  retry?: number | boolean | ((failureCount: number, error: TError) => boolean)
  retryDelay?: number | ((retryAttempt: number, error: TError) => number)
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>
  onError?: (error: TError, variables: TVariables) => void | Promise<void>
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void | Promise<void>
  onMutate?: (variables: TVariables) => void | Promise<void>
  useErrorBoundary?: boolean | ((error: TError) => boolean)
  meta?: Record<string, unknown>
}

// Optimistic Update Types
export interface OptimisticUpdate<TData> {
  type: 'update' | 'add' | 'remove'
  queryKey: unknown[]
  updater: (oldData: TData) => TData
  rollback?: (oldData: TData) => TData
}

// Parallel Request Configuration
export interface ParallelRequest<TData = unknown> {
  queryKey: unknown[]
  queryFn: () => Promise<TData>
  config?: QueryConfig<TData>
}

export interface BatchRequest {
  requests: ParallelRequest[]
  onSuccess?: (results: unknown[]) => void
  onError?: (errors: (ApiError | null)[]) => void
  onSettled?: () => void
}

// Cache Strategy Types
export type CacheStrategy = 'cache-first' | 'network-first' | 'cache-only' | 'network-only'

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

export interface InfiniteQueryConfig<TData = unknown, TError = ApiError> extends Omit<QueryConfig<TData, TError>, 'select'> {
  getNextPageParam?: (lastPage: TData, allPages: TData[]) => unknown
  getPreviousPageParam?: (firstPage: TData, allPages: TData[]) => unknown
  select?: (data: { pages: TData[]; pageParams: unknown[] }) => unknown
  maxPages?: number
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
  logLevel?: 'error' | 'warn' | 'info' | 'debug'
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

// WebSocket Types (for real-time features)
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface RealtimeSubscription<T = unknown> {
  id: string
  channel: string
  onMessage: (data: T) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Override<T, U> = Omit<T, keyof U> & U