import { useQueries, type UseQueriesOptions, type UseQueryResult } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { ApiResponse, ApiError, ParallelRequest } from '../types/index.js'
import { useApiClient } from './use-api-client.js'
import { createQueryKey } from '../utils/index.js'

export interface UseParallelQueriesOptions {
  requests: ParallelRequest[]
  combine?: (results: UseQueryResult<any, ApiError>[]) => any
  onSuccess?: (results: any[]) => void
  onError?: (errors: (ApiError | null)[]) => void
  onSettled?: () => void
}

export function useParallelQueries<TResults extends readonly unknown[]>({
  requests,
  combine,
  onSuccess,
  onError,
  onSettled
}: UseParallelQueriesOptions) {
  const client = useApiClient()

  // Memoize queries configuration
  const queriesConfig = useMemo(() => {
    return requests.map(request => ({
      queryKey: request.queryKey,
      queryFn: request.queryFn,
      ...request.config
    }))
  }, [requests])

  const results = useQueries({
    queries: queriesConfig,
    combine: (results) => {
      const data = results.map(result => result.data)
      const errors = results.map(result => result.error)
      const isLoading = results.some(result => result.isLoading)
      const isError = results.some(result => result.isError)
      const isSuccess = results.every(result => result.isSuccess)

      // Call callbacks
      if (isSuccess && onSuccess) {
        onSuccess(data)
      }
      
      if (isError && onError) {
        onError(errors)
      }

      if (!isLoading && onSettled) {
        onSettled()
      }

      const combinedResult = {
        results,
        data,
        errors,
        isLoading,
        isError,
        isSuccess,
        refetchAll: () => Promise.all(results.map(result => result.refetch()))
      }

      return combine ? combine(results) : combinedResult
    }
  } as UseQueriesOptions<any>)

  return results
}

// Hook for parallel API requests with automatic batching
export function useParallelApiRequests<TData extends readonly unknown[]>(
  requests: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    url: string
    body?: unknown
    params?: Record<string, any>
    queryKey?: unknown[]
  }>,
  options?: {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
    onSuccess?: (results: TData) => void
    onError?: (errors: (ApiError | null)[]) => void
  }
) {
  const client = useApiClient()

  const parallelRequests: ParallelRequest[] = useMemo(() => {
    return requests.map(request => {
      const queryKey = request.queryKey || createQueryKey(
        'parallel',
        request.method,
        request.url,
        request.params
      )

      const queryFn = async () => {
        const urlWithParams = request.params
          ? `${request.url}?${new URLSearchParams(
              Object.entries(request.params).map(([key, value]) => [key, String(value)])
            ).toString()}`
          : request.url

        return client.request(request.method, urlWithParams, {
          body: request.body
        })
      }

      return {
        queryKey,
        queryFn,
        config: {
          enabled: options?.enabled,
          staleTime: options?.staleTime,
          cacheTime: options?.cacheTime
        }
      }
    })
  }, [requests, client, options])

  return useParallelQueries({
    requests: parallelRequests,
    onSuccess: options?.onSuccess,
    onError: options?.onError
  })
}

// Hook for sequential requests (waterfall pattern)
export function useSequentialQueries<TData extends readonly unknown[]>(
  requests: Array<{
    queryKey: unknown[]
    queryFn: (previousResults?: any[]) => Promise<any>
    enabled?: boolean | ((previousResults: any[]) => boolean)
  }>,
  options?: {
    onSuccess?: (results: TData) => void
    onError?: (error: ApiError, index: number) => void
  }
) {
  const results = useMemo(() => {
    const queryResults: any[] = []
    return requests.map((request, index) => {
      const enabled = typeof request.enabled === 'function'
        ? request.enabled(queryResults.slice(0, index))
        : request.enabled !== false

      return {
        queryKey: [...request.queryKey, index],
        queryFn: () => request.queryFn(queryResults.slice(0, index)),
        enabled: enabled && (index === 0 || queryResults[index - 1] !== undefined),
        onSuccess: (data: any) => {
          queryResults[index] = data
          if (index === requests.length - 1 && options?.onSuccess) {
            options.onSuccess(queryResults as TData)
          }
        },
        onError: (error: ApiError) => {
          if (options?.onError) {
            options.onError(error, index)
          }
        }
      }
    })
  }, [requests, options])

  return useQueries({ queries: results })
}

// Hook for infinite parallel loading (pagination)
export function useParallelInfiniteQueries<TData = unknown>(
  baseRequests: Array<{
    queryKey: unknown[]
    url: string
    method?: 'GET' | 'POST'
    initialPageParam?: any
  }>,
  options?: {
    getNextPageParam?: (lastPage: ApiResponse<TData>, allPages: ApiResponse<TData>[]) => unknown
    maxPages?: number
    concurrency?: number
  }
) {
  // TODO: Implement infinite parallel queries
  // This would be useful for loading multiple paginated datasets simultaneously
  return useParallelQueries({ requests: [] })
}