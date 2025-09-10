import React, { createContext, useMemo, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HttpClient } from "../client/http-client.js"
import type { ApiClientConfig } from "../types/index.js"

interface ApiClientContextValue {
  client: HttpClient
  queryClient: QueryClient
}

export const ApiClientContext = createContext<ApiClientContextValue | null>(null)

interface ApiClientProviderProps {
  children: ReactNode
  config?: ApiClientConfig
  queryClient?: QueryClient
  queryClientConfig?: {
    defaultOptions?: {
      queries?: {
        staleTime?: number
        cacheTime?: number
        retry?: number | boolean
        refetchOnWindowFocus?: boolean
        refetchOnMount?: boolean
        refetchOnReconnect?: boolean
      }
      mutations?: {
        retry?: number | boolean
        retryDelay?: number
      }
    }
  }
}

export function ApiClientProvider({
  children,
  config = {},
  queryClient: providedQueryClient,
  queryClientConfig = {},
}: ApiClientProviderProps) {
  const client = useMemo(() => new HttpClient(config), [config])

  const queryClient = useMemo(() => {
    if (providedQueryClient) {
      return providedQueryClient
    }

    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          cacheTime: 10 * 60 * 1000, // 10 minutes
          retry: (failureCount, error: any) => {
            // Don't retry client errors (4xx)
            const status = error?.status
            if (status && status >= 400 && status < 500) {
              return false
            }
            return failureCount < 3
          },
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: true,
          ...queryClientConfig.defaultOptions?.queries,
        },
        mutations: {
          retry: 1,
          retryDelay: 1000,
          ...queryClientConfig.defaultOptions?.mutations,
        },
      },
    })
  }, [providedQueryClient, queryClientConfig])

  const contextValue = useMemo(
    () => ({
      client,
      queryClient,
    }),
    [client, queryClient],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={contextValue}>{children}</ApiClientContext.Provider>
    </QueryClientProvider>
  )
}
