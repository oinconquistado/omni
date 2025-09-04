# @repo/api-client

A generic, highly optimized API client library built with TanStack Query and ky.js. Designed for maximum performance, reusability, and developer experience.

## Features

🚀 **High Performance**
- Parallel request processing
- Request batching and chunking
- Automatic retry with exponential backoff
- Request deduplication
- Memory-efficient LRU caching

🔄 **Advanced Caching**
- Persistent data storage (localStorage/custom)
- Offline-first strategies
- Background synchronization
- Optimistic updates with rollback
- Stale-while-revalidate patterns

⚡ **React Integration**
- TanStack Query hooks with optimizations
- Automatic error boundaries
- Suspense support
- TypeScript-first design
- Custom hooks for common patterns

🛡️ **Reliability**
- Comprehensive error handling
- Request cancellation
- Circuit breaker patterns
- Network status awareness
- Graceful degradation

📊 **Monitoring**
- Built-in request metrics
- Performance tracking
- Detailed logging
- Request tracing

## Installation

```bash
npm install @repo/api-client @tanstack/react-query
# or
pnpm add @repo/api-client @tanstack/react-query
```

## Quick Start

### 1. Setup Provider

```tsx
import { ApiClientProvider } from '@repo/api-client'

function App() {
  return (
    <ApiClientProvider 
      config={{
        baseUrl: 'https://api.example.com',
        timeout: 30000,
        retries: 3
      }}
    >
      <YourApp />
    </ApiClientProvider>
  )
}
```

### 2. Basic Queries

```tsx
import { useApiGet } from '@repo/api-client'

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useApiGet(`/users/${userId}`)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>Hello {data?.data?.name}</div>
}
```

### 3. Mutations with Optimistic Updates

```tsx
import { useApiPut } from '@repo/api-client'

function EditUser({ userId }: { userId: string }) {
  const updateUser = useApiPut(`/users/${userId}`, {
    optimisticUpdates: [{
      type: 'update',
      queryKey: ['api', 'GET', `/users/${userId}`],
      updater: (oldData) => ({
        ...oldData,
        data: { ...oldData.data, name: 'Updating...' }
      })
    }],
    invalidateQueries: ['users'],
    onSuccess: () => {
      console.log('User updated successfully!')
    }
  })

  return (
    <button 
      onClick={() => updateUser.mutate({ name: 'New Name' })}
      disabled={updateUser.isPending}
    >
      Update User
    </button>
  )
}
```

### 4. Parallel Requests

```tsx
import { useParallelApiRequests } from '@repo/api-client'

function Dashboard() {
  const { data, isLoading } = useParallelApiRequests([
    { method: 'GET', url: '/users/me' },
    { method: 'GET', url: '/notifications' },
    { method: 'GET', url: '/settings' }
  ])

  if (isLoading) return <div>Loading dashboard...</div>

  const [user, notifications, settings] = data.data || []
  
  return (
    <div>
      <UserInfo user={user?.data} />
      <Notifications data={notifications?.data} />
      <Settings config={settings?.data} />
    </div>
  )
}
```

### 5. Infinite Queries with Virtual Scrolling

```tsx
import { useApiInfiniteScroll } from '@repo/api-client'

function PostList() {
  const {
    flatData: posts,
    isLoading,
    hasNextPage,
    fetchNextPage,
    handleScroll
  } = useApiInfiniteScroll('/posts', {
    pageSize: 20,
    triggerOffset: 100
  })

  return (
    <div 
      className="post-list"
      onScroll={handleScroll}
      style={{ height: '400px', overflow: 'auto' }}
    >
      {posts.map(post => (
        <PostItem key={post.id} post={post} />
      ))}
      {isLoading && <div>Loading more...</div>}
    </div>
  )
}
```

### 6. Persistent Queries (Offline Support)

```tsx
import { usePersistentQuery } from '@repo/api-client'

function OfflineCapableComponent() {
  const { data, isLoading, isOffline, forceSync } = usePersistentQuery({
    method: 'GET',
    url: '/important-data',
    persist: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    offlineFirst: true,
    backgroundSync: true
  })

  return (
    <div>
      {isOffline && <div>⚠️ You're offline - showing cached data</div>}
      <button onClick={forceSync} disabled={isLoading}>
        Sync Now
      </button>
      {/* Your component content */}
    </div>
  )
}
```

## Advanced Configuration

### Custom HTTP Client

```tsx
import { HttpClient } from '@repo/api-client'

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retries: 3,
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value'
  },
  interceptors: {
    request: [
      async (config, context) => {
        // Add authentication
        const token = await getAuthToken()
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        }
        return config
      }
    ],
    response: [
      async (response, context) => {
        // Transform response
        return {
          ...response,
          timestamp: Date.now()
        }
      }
    ],
    error: [
      async (error, context) => {
        // Handle global errors
        if (error.status === 401) {
          await refreshToken()
        }
        return error
      }
    ]
  }
})

// Use with provider
<ApiClientProvider client={client}>
  <App />
</ApiClientProvider>
```

### Batch Processing

```tsx
import { useApiClient } from '@repo/api-client'

function BatchProcessor() {
  const client = useApiClient()

  const processBatch = async (items: any[]) => {
    const requests = items.map(item => 
      () => client.post('/process', item)
    )

    const results = await client.batch(requests, {
      concurrency: 5,
      delay: 100, // 100ms between batches
      onProgress: (completed, total) => {
        console.log(`Progress: ${completed}/${total}`)
      }
    })

    return results
  }

  return <button onClick={() => processBatch(items)}>Process Batch</button>
}
```

### Custom Storage for Persistence

```tsx
import { usePersistentQuery } from '@repo/api-client'

// Custom storage implementation (e.g., IndexedDB)
const indexedDBStorage = {
  async getItem(key: string) {
    // Implementation
    return data
  },
  async setItem(key: string, value: string) {
    // Implementation
  },
  async removeItem(key: string) {
    // Implementation
  }
}

function Component() {
  const query = usePersistentQuery({
    url: '/data',
    storage: indexedDBStorage,
    encryptData: true,
    compressData: true
  })
}
```

## API Reference

### Types

```typescript
// Core types
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  type?: string
  timestamp?: number
}

interface ApiError extends Error {
  status?: number
  code?: string
  operation?: string
  field?: string
  requestId?: string
}

// Configuration types
interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  interceptors?: {
    request?: RequestInterceptor[]
    response?: ResponseInterceptor[]
    error?: ErrorInterceptor[]
  }
}
```

### Hooks

#### Query Hooks
- `useApiQuery` - Base query hook with full options
- `useApiGet` - Simplified GET request hook
- `useApiQueryLive` - Auto-refreshing query hook
- `useApiQuerySafe` - Query with error boundary support
- `usePersistentQuery` - Query with offline persistence

#### Mutation Hooks
- `useApiMutation` - Base mutation hook
- `useApiPost` - POST request hook
- `useApiPut` - PUT request hook
- `useApiPatch` - PATCH request hook
- `useApiDelete` - DELETE request hook

#### Advanced Hooks
- `useParallelQueries` - Execute multiple queries in parallel
- `useParallelApiRequests` - Batch API requests
- `useSequentialQueries` - Execute queries in sequence
- `useApiInfiniteQuery` - Paginated data with infinite scrolling
- `useApiInfiniteScroll` - Virtual scrolling support

### Utilities

```typescript
// Request utilities
createRequestId(): string
createQueryKey(base: string, ...params: any[]): unknown[]
buildUrl(base: string, path: string, params?: Record<string, any>): string

// Cache utilities
createLRUCache<K, V>(maxSize: number): LRUCache<K, V>
getCacheKey(key: unknown[]): string
isCacheExpired(timestamp: number, ttl: number): boolean

// Performance utilities
measurePerformance<T>(fn: () => Promise<T>, label?: string): Promise<{result: T, duration: number}>
debounce<T>(func: T, wait: number): T
throttle<T>(func: T, limit: number): T

// Data utilities
normalizeData<T>(data: T[], idKey: keyof T): Record<string, T>
chunk<T>(array: T[], size: number): T[][]
flatten<T>(arrays: T[][]): T[]
```

## Performance Tips

1. **Use Query Keys Wisely**: Consistent query keys enable effective caching
2. **Implement Optimistic Updates**: Improve perceived performance
3. **Leverage Parallel Requests**: Reduce total request time
4. **Enable Persistence**: Better offline experience
5. **Configure Appropriate Cache Times**: Balance freshness vs performance
6. **Use Infinite Queries**: For large datasets
7. **Implement Error Boundaries**: Graceful error handling
8. **Monitor Metrics**: Track performance in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run tests: `pnpm test`
5. Build: `pnpm build`
6. Submit a pull request

## License

MIT License - see LICENSE file for details