import type { ApiError, HttpMethod } from '../types/index.js'

// Request ID generation
export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// API Error creation and type guards
export function createApiError(
  error: unknown,
  method?: HttpMethod,
  url?: string
): ApiError {
  const baseError: ApiError = {
    name: 'ApiError',
    message: 'An API error occurred',
    timestamp: Date.now(),
    requestId: createRequestId()
  }

  if (error instanceof Error) {
    baseError.message = error.message
    baseError.stack = error.stack
  } else if (typeof error === 'string') {
    baseError.message = error
  } else if (error && typeof error === 'object') {
    const errorObj = error as any
    baseError.message = errorObj.message || 'Unknown error'
    baseError.status = errorObj.status
    baseError.statusText = errorObj.statusText
    baseError.code = errorObj.code
    baseError.data = errorObj.data
  }

  if (method) baseError.operation = `${method} ${url || 'unknown'}`

  return baseError
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'requestId' in error
}

// Query key utilities
export function createQueryKey(
  base: string | string[],
  ...params: Array<string | number | boolean | undefined | null>
): (string | number | boolean)[] {
  const baseArray = Array.isArray(base) ? base : [base]
  return [
    ...baseArray,
    ...params.filter((param): param is string | number | boolean => 
      param !== undefined && param !== null
    )
  ]
}

export function invalidateQueries(queryClient: any, patterns: string[]): Promise<void> {
  return Promise.all(
    patterns.map(pattern => 
      queryClient.invalidateQueries({ 
        queryKey: [pattern],
        exact: false 
      })
    )
  ).then(() => {})
}

// Cache utilities
export function getCacheKey(key: unknown[]): string {
  return JSON.stringify(key)
}

export function isCacheExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl
}

// Retry utilities
export function createExponentialBackoff(
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  multiplier: number = 2
) {
  return (attemptCount: number): number => {
    const delay = baseDelay * Math.pow(multiplier, attemptCount - 1)
    return Math.min(delay, maxDelay)
  }
}

export function createJitteredBackoff(
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitterFactor: number = 0.1
) {
  return (attemptCount: number): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount - 1)
    const jitter = exponentialDelay * jitterFactor * Math.random()
    const delay = exponentialDelay + jitter
    return Math.min(delay, maxDelay)
  }
}

// Debounce and throttle
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Data transformation utilities
export function transformApiResponse<T, U>(
  response: T,
  transformer: (data: T) => U
): U {
  return transformer(response)
}

export function normalizeData<T extends Record<string, any>>(
  data: T[],
  idKey: keyof T = 'id'
): Record<string, T> {
  return data.reduce((acc, item) => {
    acc[String(item[idKey])] = item
    return acc
  }, {} as Record<string, T>)
}

// Optimistic update utilities
export function applyOptimisticUpdate<T>(
  oldData: T,
  update: Partial<T>
): T {
  if (Array.isArray(oldData)) {
    return [...oldData] as T
  }
  
  if (oldData && typeof oldData === 'object') {
    return { ...oldData, ...update }
  }
  
  return oldData
}

export function rollbackOptimisticUpdate<T>(
  currentData: T,
  originalData: T
): T {
  return originalData
}

// Validation utilities
export function validateResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T {
  if (!validator(data)) {
    throw createApiError('Invalid response format')
  }
  return data
}

// URL utilities
export function buildUrl(base: string, path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(path, base)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
  }
  
  return url.toString()
}

export function parseUrlParams(url: string): Record<string, string> {
  const urlObj = new URL(url)
  const params: Record<string, string> = {}
  
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

// Performance utilities
export function measurePerformance<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  
  return fn().then(result => {
    const duration = performance.now() - start
    
    if (label) {
      console.log(`${label} took ${duration.toFixed(2)}ms`)
    }
    
    return { result, duration }
  })
}

// Memory management
export function createLRUCache<K, V>(maxSize: number = 100) {
  const cache = new Map<K, V>()
  
  return {
    get(key: K): V | undefined {
      const value = cache.get(key)
      if (value !== undefined) {
        // Move to end (most recently used)
        cache.delete(key)
        cache.set(key, value)
      }
      return value
    },
    
    set(key: K, value: V): void {
      if (cache.has(key)) {
        cache.delete(key)
      } else if (cache.size >= maxSize) {
        // Remove least recently used (first item)
        const firstKey = cache.keys().next().value as K
        if (firstKey !== undefined) cache.delete(firstKey)
      }
      cache.set(key, value)
    },
    
    has(key: K): boolean {
      return cache.has(key)
    },
    
    delete(key: K): boolean {
      return cache.delete(key)
    },
    
    clear(): void {
      cache.clear()
    },
    
    size(): number {
      return cache.size
    }
  }
}

// Type utilities
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Async utilities
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(createApiError(`Operation timed out after ${ms}ms`)), ms)
    )
  ])
}

// Array utilities for batch operations
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function flatten<T>(arrays: T[][]): T[] {
  return arrays.reduce((acc, arr) => acc.concat(arr), [])
}