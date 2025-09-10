import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import type {
  ApiResponse,
  InfiniteQueryConfig,
  ApiError,
  PaginatedResponse,
  HttpMethod,
  RequestConfig,
} from "../types/index.js"
import { createQueryKey } from "../utils/index.js"
import { useApiClient } from "./use-api-client.js"

export interface UseApiInfiniteQueryOptions<TData = unknown, TError = ApiError>
  extends InfiniteQueryConfig<PaginatedResponse<TData>, TError> {
  method?: HttpMethod
  url: string
  params?: Record<string, any>
  requestConfig?: RequestConfig
  queryKey?: unknown[]
  pageSize?: number
  enabled?: boolean
}

export function useApiInfiniteQuery<TData = unknown, TError = ApiError>(
  options: UseApiInfiniteQueryOptions<TData, TError>,
): UseInfiniteQueryResult<PaginatedResponse<TData>, TError> & {
  loadAll: () => Promise<void>
  reset: () => void
  flatData: TData[]
  totalCount: number
  hasData: boolean
} {
  const client = useApiClient()

  const {
    method = "GET",
    url,
    params = {},
    requestConfig,
    queryKey: customQueryKey,
    pageSize = 20,
    enabled = true,
    getNextPageParam,
    getPreviousPageParam,
    maxPages = 50,
    ...queryOptions
  } = options

  // Memoize query key
  const queryKey = useMemo(() => {
    if (customQueryKey) {
      return customQueryKey
    }
    return createQueryKey("infinite", method, url, params, pageSize)
  }, [customQueryKey, method, url, params, pageSize])

  // Memoize query function
  const queryFn = useCallback(
    async ({ pageParam = 1 }): Promise<PaginatedResponse<TData>> => {
      const queryParams = {
        ...params,
        page: pageParam,
        limit: pageSize,
      }

      const urlWithParams = `${url}?${new URLSearchParams(
        Object.entries(queryParams).map(([key, value]) => [key, String(value)]),
      ).toString()}`

      const response = await client.request<TData[]>(method, urlWithParams, requestConfig)

      // Ensure response matches PaginatedResponse interface
      if (response.success && Array.isArray(response.data)) {
        return {
          ...response,
          pagination: {
            page: pageParam,
            limit: pageSize,
            total: response.data.length, // This should come from the API
            totalPages: Math.ceil((response.data.length || 0) / pageSize),
            hasNext: response.data.length === pageSize,
            hasPrev: pageParam > 1,
          },
        } as PaginatedResponse<TData>
      }

      return response as PaginatedResponse<TData>
    },
    [client, method, url, params, pageSize, requestConfig],
  )

  // Default page param functions
  const defaultGetNextPageParam = useCallback((lastPage: PaginatedResponse<TData>) => {
    if (lastPage.pagination?.hasNext) {
      return lastPage.pagination.page + 1
    }
    return undefined
  }, [])

  const defaultGetPreviousPageParam = useCallback((firstPage: PaginatedResponse<TData>) => {
    if (firstPage.pagination?.hasPrev) {
      return firstPage.pagination.page - 1
    }
    return undefined
  }, [])

  const query = useInfiniteQuery<PaginatedResponse<TData>, TError>({
    queryKey,
    queryFn,
    enabled,
    getNextPageParam: getNextPageParam || defaultGetNextPageParam,
    getPreviousPageParam: getPreviousPageParam || defaultGetPreviousPageParam,
    maxPages,
    ...queryOptions,
  })

  // Utility functions
  const loadAll = useCallback(async (): Promise<void> => {
    while (query.hasNextPage && !query.isFetchingNextPage) {
      await query.fetchNextPage()
    }
  }, [query])

  const reset = useCallback(() => {
    query.remove()
  }, [query])

  // Computed values
  const flatData = useMemo(() => {
    return (
      query.data?.pages.reduce<TData[]>((acc, page) => {
        if (page.success && page.data) {
          return acc.concat(page.data)
        }
        return acc
      }, []) || []
    )
  }, [query.data])

  const totalCount = useMemo(() => {
    const lastPage = query.data?.pages[query.data.pages.length - 1]
    return lastPage?.pagination?.total || flatData.length
  }, [query.data, flatData.length])

  const hasData = useMemo(() => {
    return flatData.length > 0
  }, [flatData.length])

  return useMemo(
    () => ({
      ...query,
      loadAll,
      reset,
      flatData,
      totalCount,
      hasData,
    }),
    [query, loadAll, reset, flatData, totalCount, hasData],
  )
}

// Specialized hook for paginated GET requests
export function useApiInfiniteGet<TData = unknown, TError = ApiError>(
  url: string,
  options?: Omit<UseApiInfiniteQueryOptions<TData, TError>, "method" | "url">,
) {
  return useApiInfiniteQuery<TData, TError>({
    ...options,
    method: "GET",
    url,
  })
}

// Hook with virtual scrolling support
export function useApiInfiniteScroll<TData = unknown, TError = ApiError>(
  url: string,
  options?: Omit<UseApiInfiniteQueryOptions<TData, TError>, "method" | "url"> & {
    triggerOffset?: number
    onLoadMore?: () => void
  },
) {
  const { triggerOffset = 100, onLoadMore, ...queryOptions } = options || {}

  const query = useApiInfiniteGet<TData, TError>(url, queryOptions)

  // Scroll handler
  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement
      const { scrollTop, scrollHeight, clientHeight } = target

      if (scrollHeight - scrollTop <= clientHeight + triggerOffset && query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage()
        if (onLoadMore) {
          onLoadMore()
        }
      }
    },
    [query, triggerOffset, onLoadMore],
  )

  return useMemo(
    () => ({
      ...query,
      handleScroll,
    }),
    [query, handleScroll],
  )
}

// Hook with search/filter support
export function useApiInfiniteSearch<TData = unknown, TError = ApiError>(
  url: string,
  searchParams: Record<string, any>,
  options?: Omit<UseApiInfiniteQueryOptions<TData, TError>, "method" | "url" | "params"> & {
    debounceMs?: number
    minSearchLength?: number
  },
) {
  const { debounceMs = 300, minSearchLength = 2, ...queryOptions } = options || {}

  // Check if search should be enabled
  const shouldSearch = useMemo(() => {
    const searchTerm = searchParams.q || searchParams.search || ""
    return !searchTerm || searchTerm.length >= minSearchLength
  }, [searchParams, minSearchLength])

  const query = useApiInfiniteGet<TData, TError>(url, {
    ...queryOptions,
    params: searchParams,
    enabled: shouldSearch && queryOptions.enabled !== false,
  })

  // Debounced search function
  const search = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (newParams: Record<string, any>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          query.refetch()
        }, debounceMs)
      }
    })(),
    [query, debounceMs],
  )

  return useMemo(
    () => ({
      ...query,
      search,
    }),
    [query, search],
  )
}
