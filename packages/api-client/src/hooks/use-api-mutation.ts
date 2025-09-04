import { 
  useMutation, 
  useQueryClient,
  type UseMutationResult,
  type QueryClient
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type {
  ApiResponse,
  MutationConfig,
  ApiError,
  HttpMethod,
  RequestConfig,
  OptimisticUpdate
} from '../types/index.js'
import { createQueryKey } from '../utils/index.js'
import { useApiClient } from './use-api-client.js'

export interface UseApiMutationOptions<TData = unknown, TError = ApiError, TVariables = unknown>
  extends MutationConfig<ApiResponse<TData>, TError, TVariables> {
  method: HttpMethod
  url: string | ((variables: TVariables) => string)
  requestConfig?: RequestConfig
  optimisticUpdates?: OptimisticUpdate<any>[]
  invalidateQueries?: string[]
  updateQueries?: Array<{
    queryKey: unknown[]
    updater: (oldData: any, newData: TData, variables: TVariables) => any
  }>
}

export function useApiMutation<TData = unknown, TError = ApiError, TVariables = unknown>(
  options: UseApiMutationOptions<TData, TError, TVariables>
) {
  const client = useApiClient()
  const queryClient = useQueryClient()

  const {
    method,
    url,
    requestConfig,
    optimisticUpdates = [],
    invalidateQueries = [],
    updateQueries = [],
    onSuccess,
    onError,
    onSettled,
    onMutate,
    ...mutationOptions
  } = options

  // Memoize mutation function
  const mutationFn = useCallback(async (variables: TVariables): Promise<ApiResponse<TData>> => {
    const finalUrl = typeof url === 'function' ? url(variables) : url
    
    if (method === 'GET') {
      return client.get<TData>(finalUrl, requestConfig)
    }
    
    const body = variables
    
    switch (method) {
      case 'POST':
        return client.post<TData>(finalUrl, body, requestConfig)
      case 'PUT':
        return client.put<TData>(finalUrl, body, requestConfig)
      case 'PATCH':
        return client.patch<TData>(finalUrl, body, requestConfig)
      case 'DELETE':
        return client.delete<TData>(finalUrl, requestConfig)
      default:
        return client.request<TData>(method, finalUrl, { ...requestConfig, body })
    }
  }, [client, method, url, requestConfig])

  // Enhanced onMutate with optimistic updates
  const enhancedOnMutate = useCallback(async (variables: TVariables) => {
    // Apply optimistic updates
    const previousData: Record<string, any> = {}
    
    for (const update of optimisticUpdates) {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: update.queryKey })
      
      // Snapshot the previous value
      previousData[JSON.stringify(update.queryKey)] = queryClient.getQueryData(update.queryKey)
      
      // Optimistically update
      queryClient.setQueryData(update.queryKey, (old: any) => {
        if (old) {
          return update.updater(old)
        }
        return old
      })
    }

    // Call custom onMutate
    const context = onMutate ? await onMutate(variables) : undefined
    
    // Return context with previous data for rollback
    return { previousData, customContext: context }
  }, [queryClient, optimisticUpdates, onMutate])

  // Enhanced onError with rollback
  const enhancedOnError = useCallback((error: TError, variables: TVariables, context: any) => {
    // Rollback optimistic updates
    if (context?.previousData) {
      for (const update of optimisticUpdates) {
        const key = JSON.stringify(update.queryKey)
        const previousValue = context.previousData[key]
        
        if (previousValue !== undefined) {
          queryClient.setQueryData(update.queryKey, previousValue)
        }
      }
    }

    // Call custom onError
    if (onError) {
      onError(error, variables)
    }
  }, [queryClient, optimisticUpdates, onError])

  // Enhanced onSuccess with cache updates
  const enhancedOnSuccess = useCallback((data: ApiResponse<TData>, variables: TVariables, context: any) => {
    // Update specific queries
    for (const update of updateQueries) {
      queryClient.setQueryData(update.queryKey, (oldData: any) => {
        if (oldData && data.data) {
          return update.updater(oldData, data.data, variables)
        }
        return oldData
      })
    }

    // Invalidate specified queries
    for (const queryPattern of invalidateQueries) {
      queryClient.invalidateQueries({
        queryKey: [queryPattern],
        exact: false
      })
    }

    // Call custom onSuccess
    if (onSuccess) {
      onSuccess(data, variables)
    }
  }, [queryClient, updateQueries, invalidateQueries, onSuccess])

  // Enhanced onSettled
  const enhancedOnSettled = useCallback((
    data: ApiResponse<TData> | undefined,
    error: TError | null,
    variables: TVariables,
    context: any
  ) => {
    // Call custom onSettled
    if (onSettled) {
      onSettled(data, error, variables)
    }
  }, [onSettled])

  const mutation = useMutation<ApiResponse<TData>, TError, TVariables>({
    mutationFn,
    onMutate: enhancedOnMutate,
    onError: enhancedOnError,
    onSuccess: enhancedOnSuccess,
    onSettled: enhancedOnSettled,
    ...mutationOptions
  })

  // Optimistic mutation that applies updates immediately
  const mutateOptimistic = useCallback(async (variables: TVariables): Promise<ApiResponse<TData>> => {
    return new Promise((resolve, reject) => {
      mutation.mutate(variables, {
        onSuccess: resolve,
        onError: reject
      })
    })
  }, [mutation])

  // Reset function
  const reset = useCallback(() => {
    mutation.reset()
  }, [mutation])

  return {
    ...mutation,
    mutateOptimistic,
    reset
  }
}

// Specialized hooks for different HTTP methods
export function useApiPost<TData = unknown, TError = ApiError, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  options?: Omit<UseApiMutationOptions<TData, TError, TVariables>, 'method' | 'url'>
) {
  return useApiMutation<TData, TError, TVariables>({
    ...options,
    method: 'POST',
    url
  })
}

export function useApiPut<TData = unknown, TError = ApiError, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  options?: Omit<UseApiMutationOptions<TData, TError, TVariables>, 'method' | 'url'>
) {
  return useApiMutation<TData, TError, TVariables>({
    ...options,
    method: 'PUT',
    url
  })
}

export function useApiPatch<TData = unknown, TError = ApiError, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  options?: Omit<UseApiMutationOptions<TData, TError, TVariables>, 'method' | 'url'>
) {
  return useApiMutation<TData, TError, TVariables>({
    ...options,
    method: 'PATCH',
    url
  })
}

export function useApiDelete<TData = unknown, TError = ApiError, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  options?: Omit<UseApiMutationOptions<TData, TError, TVariables>, 'method' | 'url'>
) {
  return useApiMutation<TData, TError, TVariables>({
    ...options,
    method: 'DELETE',
    url
  })
}