import ky, { type KyInstance, type Options as KyOptions } from 'ky'
import type {
  ApiClientConfig,
  ApiError,
  ApiResponse,
  HttpMethod,
  RequestConfig,
  RequestContext,
  RequestMetrics
} from '../types/index.js'
import { createRequestId, createApiError, isApiError } from '../utils/index.js'

export class HttpClient {
  private instance: KyInstance
  private config: ApiClientConfig & Required<Pick<ApiClientConfig, 'baseUrl' | 'timeout' | 'retries' | 'retryDelay' | 'headers' | 'cache' | 'cacheTTL'>>
  private metrics: RequestMetrics[] = []
  private abortControllers = new Map<string, AbortController>()

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: '',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: true,
      cacheTTL: 300000, // 5 minutes
      name: 'api-client',
      version: '1.0.0',
      defaultCacheStrategy: 'cache-first',
      enableMetrics: true,
      enableLogging: false,
      logLevel: 'error',
      interceptors: {
        request: [],
        response: [],
        error: []
      },
      ...config
    }

    this.instance = this.createKyInstance()
  }

  private createKyInstance(): KyInstance {
    const kyOptions: KyOptions = {
      prefixUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retry: {
        limit: this.config.retries,
        delay: (attemptCount) => this.config.retryDelay * Math.pow(2, attemptCount - 1)
      },
      headers: this.config.headers,
      hooks: {
        beforeRequest: [
          async (request, options) => {
            const context = this.createRequestContext()
            
            // Apply request interceptors
            let requestConfig: RequestConfig = {
              baseUrl: this.config.baseUrl,
              timeout: this.config.timeout,
              headers: Object.fromEntries(request.headers.entries())
            }

            for (const interceptor of this.config.interceptors?.request || []) {
              requestConfig = await interceptor(requestConfig, context)
            }

            // Update request with interceptor modifications
            if (requestConfig.headers) {
              Object.entries(requestConfig.headers).forEach(([key, value]) => {
                request.headers.set(key, value)
              })
            }

            // Add request ID header
            request.headers.set('X-Request-ID', context.requestId)

            this.log('debug', `Request started: ${request.method} ${request.url}`, { context })
          }
        ],
        beforeRetry: [
          async ({ request, options, error, retryCount }) => {
            this.log('warn', `Retrying request (${retryCount}/${this.config.retries}): ${request.method} ${request.url}`, { error })
          }
        ],
        afterResponse: [
          async (request, options, response) => {
            const requestId = request.headers.get('X-Request-ID') || createRequestId()
            const context = this.getRequestContext(requestId)

            if (context) {
              context.retryCount = 0 // Reset retry count on success
              this.recordMetrics(request, response, context, true)
            }

            // Apply response interceptors
            let responseData = await response.json()
            for (const interceptor of this.config.interceptors?.response || []) {
              responseData = await interceptor(responseData, context!)
            }

            this.log('debug', `Request completed: ${request.method} ${request.url}`, { 
              status: response.status,
              requestId 
            })

            return new Response(JSON.stringify(responseData), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            })
          }
        ],
        beforeError: [
          async (error) => {
            const request = error.request
            const requestId = request.headers.get('X-Request-ID') || createRequestId()
            const context = this.getRequestContext(requestId)

            if (context) {
              this.recordMetrics(request, error.response, context, false)
            }

            let apiError = createApiError(error, request.method as HttpMethod, request.url)

            // Apply error interceptors
            for (const interceptor of this.config.interceptors?.error || []) {
              apiError = await interceptor(apiError, context!)
            }

            this.log('error', `Request failed: ${request.method} ${request.url}`, { 
              error: apiError,
              requestId 
            })

            throw apiError
          }
        ]
      }
    }

    return ky.create(kyOptions)
  }

  private createRequestContext(): RequestContext {
    const requestId = createRequestId()
    const abortController = new AbortController()
    
    const context: RequestContext = {
      requestId,
      timestamp: Date.now(),
      abortController,
      retryCount: 0,
      startTime: performance.now()
    }

    this.abortControllers.set(requestId, abortController)
    return context
  }

  private getRequestContext(requestId: string): RequestContext | undefined {
    const abortController = this.abortControllers.get(requestId)
    if (!abortController) return undefined

    return {
      requestId,
      timestamp: Date.now(),
      abortController,
      retryCount: 0,
      startTime: performance.now()
    }
  }

  private recordMetrics(
    request: Request,
    response: Response | undefined,
    context: RequestContext,
    success: boolean
  ): void {
    if (!this.config.enableMetrics) return

    const metrics: RequestMetrics = {
      requestId: context.requestId,
      method: request.method as HttpMethod,
      url: request.url,
      startTime: context.startTime,
      endTime: performance.now(),
      duration: performance.now() - context.startTime,
      status: response?.status,
      success,
      cached: false, // TODO: Implement cache detection
      retryCount: context.retryCount,
      error: success ? undefined : 'Request failed'
    }

    this.metrics.push(metrics)

    // Keep only last 1000 metrics entries
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, data?: unknown): void {
    if (!this.config.enableLogging) return

    const levels = { error: 0, warn: 1, info: 2, debug: 3 }
    const currentLevel = levels[this.config.logLevel]
    const messageLevel = levels[level]

    if (messageLevel <= currentLevel) {
      console[level](`[${this.config.name}] ${message}`, data)
    }
  }

  // Public API methods
  async request<T = unknown>(
    method: HttpMethod,
    url: string,
    options: RequestConfig & { body?: unknown } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { body, signal, ...kyOptions } = options

      const kyMethod = method.toLowerCase() as keyof KyInstance
      let response: Response

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        response = await (this.instance[kyMethod] as any)(url, {
          json: body,
          signal,
          ...kyOptions
        })
      } else {
        response = await (this.instance[kyMethod] as any)(url, {
          signal,
          ...kyOptions
        })
      }

      const data = await response.json()
      return data as ApiResponse<T>

    } catch (error) {
      if (isApiError(error)) {
        throw error
      }
      throw createApiError(error, method, url)
    }
  }

  async get<T = unknown>(url: string, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, options)
  }

  async post<T = unknown>(url: string, body?: unknown, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, { ...options, body })
  }

  async put<T = unknown>(url: string, body?: unknown, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, { ...options, body })
  }

  async patch<T = unknown>(url: string, body?: unknown, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, { ...options, body })
  }

  async delete<T = unknown>(url: string, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, options)
  }

  // Parallel request support
  async parallel<T extends readonly unknown[]>(
    requests: readonly [...{ [K in keyof T]: () => Promise<T[K]> }]
  ): Promise<T> {
    const results = await Promise.allSettled(
      requests.map(fn => fn())
    )

    const successResults: unknown[] = []
    const errors: ApiError[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successResults[index] = result.value
      } else {
        errors[index] = isApiError(result.reason) 
          ? result.reason 
          : createApiError(result.reason, 'GET', `parallel-request-${index}`)
      }
    })

    if (errors.length > 0 && successResults.length === 0) {
      throw new AggregateError(errors, 'All parallel requests failed')
    }

    return successResults as unknown as T
  }

  // Batch request processing
  async batch<T = unknown>(requests: Array<() => Promise<T>>, options?: {
    concurrency?: number
    delay?: number
    onProgress?: (completed: number, total: number) => void
  }): Promise<T[]> {
    const { concurrency = 5, delay = 0, onProgress } = options || {}
    const results: T[] = []
    const errors: ApiError[] = []

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(fn => fn())
      )

      batchResults.forEach((result, batchIndex) => {
        const globalIndex = i + batchIndex
        if (result.status === 'fulfilled') {
          results[globalIndex] = result.value
        } else {
          errors[globalIndex] = isApiError(result.reason)
            ? result.reason
            : createApiError(result.reason, 'GET', `batch-request-${globalIndex}`)
        }
      })

      if (onProgress) {
        onProgress(Math.min(i + concurrency, requests.length), requests.length)
      }

      if (delay > 0 && i + concurrency < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (errors.length > 0) {
      this.log('warn', `Batch completed with ${errors.length} errors out of ${requests.length} requests`)
    }

    return results
  }

  // Abort request
  abort(requestId: string): void {
    const controller = this.abortControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(requestId)
    }
  }

  // Abort all pending requests
  abortAll(): void {
    this.abortControllers.forEach(controller => controller.abort())
    this.abortControllers.clear()
  }

  // Get metrics
  getMetrics(): RequestMetrics[] {
    return [...this.metrics]
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = []
  }

  // Update configuration
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config }
    this.instance = this.createKyInstance()
  }

  // Get current configuration
  getConfig(): ApiClientConfig {
    return { ...this.config }
  }
}