// Core client
export { HttpClient } from "./client/http-client.js"

// Types and interfaces
export type * from "./types/index.js"

// React hooks
export { ApiClientProvider, ApiClientContext } from "./hooks/api-client-provider.js"
export { useApiClient, useApiClientConfig } from "./hooks/use-api-client.js"
export { useApiQuery, useApiGet, useApiQueryLive, useApiQuerySafe } from "./hooks/use-api-query.js"
export {
  useApiMutation,
  useApiPost,
  useApiPut,
  useApiPatch,
  useApiDelete,
} from "./hooks/use-api-mutation.js"
export {
  useParallelQueries,
  useParallelApiRequests,
  useSequentialQueries,
} from "./hooks/use-parallel-queries.js"
export {
  useApiInfiniteQuery,
  useApiInfiniteGet,
  useApiInfiniteScroll,
  useApiInfiniteSearch,
} from "./hooks/use-infinite-query.js"
export {
  usePersistentQuery,
  usePersistentQueryWithRetry,
  usePersistentMutationQueue,
} from "./hooks/use-persistent-query.js"

// Utilities
export {
  createRequestId,
  createApiError,
  isApiError,
  createQueryKey,
  invalidateQueries,
  getCacheKey,
  isCacheExpired,
  createExponentialBackoff,
  createJitteredBackoff,
  debounce,
  throttle,
  transformApiResponse,
  normalizeData,
  applyOptimisticUpdate,
  rollbackOptimisticUpdate,
  validateResponse,
  buildUrl,
  parseUrlParams,
  measurePerformance,
  createLRUCache,
  sleep,
  timeout,
  chunk,
  flatten,
} from "./utils/index.js"
