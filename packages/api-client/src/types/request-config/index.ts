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