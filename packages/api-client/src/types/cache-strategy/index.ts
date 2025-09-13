export type CacheStrategy = "cache-first" | "network-first" | "cache-only" | "network-only"

export interface CacheConfig {
  strategy: CacheStrategy
  ttl?: number
  maxAge?: number
  tags?: string[]
  invalidateOnError?: boolean
}