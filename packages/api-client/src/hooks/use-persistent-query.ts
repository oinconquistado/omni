import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import type { 
  ApiResponse, 
  QueryConfig, 
  ApiError,
  HttpMethod,
  RequestConfig 
} from '../types/index.js'
import { createQueryKey } from '../utils/index.js'
import { useApiClient } from './use-api-client.js'

// Persistent storage interface
interface PersistentStorage {
  getItem: (key: string) => Promise<string | null> | string | null
  setItem: (key: string, value: string) => Promise<void> | void
  removeItem: (key: string) => Promise<void> | void
}

// Default storage implementations
const defaultStorage: PersistentStorage = {
  getItem: (key: string) => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch {
      // Silently fail
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch {
      // Silently fail
    }
  }
}

export interface UsePersistentQueryOptions<TData = unknown, TError = ApiError> 
  extends QueryConfig<ApiResponse<TData>, TError> {
  method?: HttpMethod
  url: string
  params?: Record<string, any>
  requestConfig?: RequestConfig
  queryKey?: unknown[]
  
  // Persistence options
  persist?: boolean
  persistKey?: string
  storage?: PersistentStorage
  maxAge?: number // Maximum age in milliseconds
  encryptData?: boolean
  compressData?: boolean
  
  // Background sync
  backgroundSync?: boolean
  syncInterval?: number
  
  // Offline support
  offlineFirst?: boolean
  revalidateOnReconnect?: boolean
}

interface PersistedData<T> {
  data: T
  timestamp: number
  version: string
  queryKey: unknown[]
  etag?: string
}

export function usePersistentQuery<TData = unknown, TError = ApiError>(
  options: UsePersistentQueryOptions<TData, TError>
) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  
  const {
    method = 'GET',
    url,
    params,
    requestConfig,
    queryKey: customQueryKey,
    persist = true,
    persistKey,
    storage = defaultStorage,
    maxAge = 24 * 60 * 60 * 1000, // 24 hours
    encryptData = false,
    compressData = false,
    backgroundSync = false,
    syncInterval = 5 * 60 * 1000, // 5 minutes
    offlineFirst = false,
    revalidateOnReconnect = true,
    enabled = true,
    ...queryOptions
  } = options

  // Generate query key and persistence key
  const queryKey = useMemo(() => {
    if (customQueryKey) return customQueryKey
    return createQueryKey('persistent', method, url, JSON.stringify(params))
  }, [customQueryKey, method, url, params])

  const storageKey = useMemo(() => {
    return persistKey || `api-cache:${JSON.stringify(queryKey)}`
  }, [persistKey, queryKey])

  // Load persisted data
  const loadPersistedData = useCallback(async (): Promise<PersistedData<ApiResponse<TData>> | null> => {
    if (!persist) return null

    try {
      const stored = await storage.getItem(storageKey)
      if (!stored) return null

      const parsed: PersistedData<ApiResponse<TData>> = JSON.parse(stored)
      
      // Check if data is expired
      if (Date.now() - parsed.timestamp > maxAge) {
        await storage.removeItem(storageKey)
        return null
      }

      // TODO: Implement decryption if encryptData is true
      // TODO: Implement decompression if compressData is true

      return parsed
    } catch (error) {
      console.warn('Failed to load persisted data:', error)
      return null
    }
  }, [persist, storage, storageKey, maxAge])

  // Save data to persistence
  const savePersistedData = useCallback(async (data: ApiResponse<TData>, etag?: string): Promise<void> => {
    if (!persist) return

    try {
      const persistedData: PersistedData<ApiResponse<TData>> = {
        data,
        timestamp: Date.now(),
        version: '1.0',
        queryKey,
        etag
      }

      // TODO: Implement encryption if encryptData is true
      // TODO: Implement compression if compressData is true

      const serialized = JSON.stringify(persistedData)
      await storage.setItem(storageKey, serialized)
    } catch (error) {
      console.warn('Failed to persist data:', error)
    }
  }, [persist, storage, storageKey, queryKey])

  // Enhanced query function with persistence
  const queryFn = useCallback(async (): Promise<ApiResponse<TData>> => {
    // Try offline-first approach
    if (offlineFirst) {
      const cached = await loadPersistedData()
      if (cached) {
        return cached.data
      }
    }

    // Make network request
    const urlWithParams = params 
      ? `${url}?${new URLSearchParams(
          Object.entries(params).map(([key, value]) => [key, String(value)])
        ).toString()}`
      : url

    const response = await client.request<TData>(method, urlWithParams, requestConfig)
    
    // Save to persistence
    await savePersistedData(response)
    
    return response
  }, [client, method, url, params, requestConfig, offlineFirst, loadPersistedData, savePersistedData])

  // Initialize with persisted data
  useEffect(() => {
    if (persist && enabled) {
      loadPersistedData().then(cached => {
        if (cached) {
          queryClient.setQueryData(queryKey, cached.data)
        }
      })
    }
  }, [persist, enabled, loadPersistedData, queryClient, queryKey])

  // Background sync
  useEffect(() => {
    if (!backgroundSync || !enabled) return

    const interval = setInterval(async () => {
      try {
        if (navigator.onLine) {
          const result = await queryClient.fetchQuery({
            queryKey,
            queryFn,
            staleTime: 0
          })
          
          if (result && typeof result === 'object' && 'success' in result) {
            await savePersistedData(result as ApiResponse<TData>)
          }
        }
      } catch (error) {
        console.warn('Background sync failed:', error)
      }
    }, syncInterval)

    return () => clearInterval(interval)
  }, [backgroundSync, enabled, queryClient, queryKey, queryFn, syncInterval, savePersistedData])

  // Network status handling
  useEffect(() => {
    if (!revalidateOnReconnect) return

    const handleOnline = () => {
      queryClient.invalidateQueries({ queryKey })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [revalidateOnReconnect, queryClient, queryKey])

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    networkMode: offlineFirst ? 'offlineFirst' : 'online',
    ...queryOptions
  } as any)

  // Enhanced methods
  const clearPersistence = useCallback(async () => {
    try {
      await storage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear persistence:', error)
    }
  }, [storage, storageKey])

  const getPersistedData = useCallback(() => {
    return loadPersistedData()
  }, [loadPersistedData])

  const forceSync = useCallback(async () => {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline')
    }

    const result = await query.refetch()
    if (result.data) {
      await savePersistedData(result.data)
    }
    return result
  }, [query, savePersistedData])

  return useMemo(() => ({
    ...query,
    clearPersistence,
    getPersistedData,
    forceSync,
    isOffline: !navigator.onLine
  }), [query, clearPersistence, getPersistedData, forceSync])
}

// Hook with automatic retry and exponential backoff for failed requests
export function usePersistentQueryWithRetry<TData = unknown, TError = ApiError>(
  options: UsePersistentQueryOptions<TData, TError> & {
    maxRetries?: number
    retryDelay?: number
    exponentialBackoff?: boolean
  }
) {
  const { maxRetries = 5, retryDelay = 1000, exponentialBackoff = true, ...queryOptions } = options

  return usePersistentQuery<TData, TError>({
    ...queryOptions,
    retry: (failureCount, error: any) => {
      // Don't retry client errors
      if (error?.status && error.status >= 400 && error.status < 500) {
        return false
      }
      
      return failureCount < maxRetries
    },
    retryDelay: exponentialBackoff 
      ? (attemptIndex) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000)
      : retryDelay
  })
}

// Hook for queue-based persistence (for mutations)
export function usePersistentMutationQueue() {
  // TODO: Implement mutation queue with persistence
  // This would store failed mutations and retry them when online
  
  return {
    addToQueue: () => {},
    processQueue: () => {},
    clearQueue: () => {},
    getQueueSize: () => 0
  }
}