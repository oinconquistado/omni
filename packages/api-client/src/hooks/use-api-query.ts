import { useQuery, type UseQueryResult, type QueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import type { ApiResponse, QueryConfig, ApiError, HttpMethod, RequestConfig } from "../types/index.js"
import { createQueryKey } from "../utils/index.js"
import { useApiClient } from "./use-api-client.js"

export interface UseApiQueryOptions<TData = unknown, TError = ApiError>
  extends QueryConfig<ApiResponse<TData>, TError> {
  method?: HttpMethod
  url: string
  params?: Record<string, any>
  requestConfig?: RequestConfig
  queryKey?: unknown[]
  enabled?: boolean
}

export function useApiQuery<TData = unknown, TError = ApiError>(options: UseApiQueryOptions<TData, TError>) {
  const client = useApiClient()

  const {
    method = "GET",
    url,
    params,
    requestConfig,
    queryKey: customQueryKey,
    enabled = true,
    ...queryOptions
  } = options

  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => {
    if (customQueryKey) {
      return customQueryKey
    }
    return createQueryKey("api", method, url, JSON.stringify(params))
  }, [customQueryKey, method, url, params])

  // Memoize query function
  const queryFn = useCallback(async (): Promise<ApiResponse<TData>> => {
    const urlWithParams = params
      ? `${url}?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()}`
      : url

    return client.request<TData>(method, urlWithParams, requestConfig)
  }, [client, method, url, params, requestConfig])

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    ...queryOptions,
  } as any)

  // Memoize utility functions
  const refresh = useCallback(async () => {
    return await query.refetch()
  }, [query])

  const prefetch = useCallback(async (): Promise<void> => {
    // Implement prefetch if needed
  }, [])

  return {
    ...query,
    refresh,
    prefetch,
  }
}

// Specialized hook for GET requests
export function useApiGet<TData = unknown, TError = ApiError>(
  url: string,
  options?: Omit<UseApiQueryOptions<TData, TError>, "method" | "url">,
) {
  return useApiQuery<TData, TError>({
    ...options,
    method: "GET",
    url,
  })
}

// Hook with automatic refetch on focus/reconnect
export function useApiQueryLive<TData = unknown, TError = ApiError>(options: UseApiQueryOptions<TData, TError>) {
  return useApiQuery<TData, TError>({
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30000, // 30 seconds
    ...options,
  })
}

// Hook with optimistic error boundary
export function useApiQuerySafe<TData = unknown, TError = ApiError>(options: UseApiQueryOptions<TData, TError>) {
  return useApiQuery<TData, TError>({
    useErrorBoundary: (error) => {
      // Only throw to error boundary for server errors (5xx)
      return (error as ApiError)?.status ? (error as ApiError).status >= 500 : false
    },
    retry: (failureCount, error) => {
      // Don't retry client errors (4xx)
      const status = (error as ApiError)?.status
      if (status && status >= 400 && status < 500) {
        return false
      }
      return failureCount < 3
    },
    ...options,
  })
}
