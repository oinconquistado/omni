import { Redis } from "ioredis"
import { env } from "../config/env.js"

class RedisClient {
  private static instance: RedisClient
  private client: Redis

  private constructor() {
    this.client = new Redis(env.REDIS_URL, {
      db: env.REDIS_DB,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: env.CACHE_PREFIX,
      connectTimeout: 10000,
      commandTimeout: 5000,
      tls: env.REDIS_URL.includes("rediss://") ? {} : undefined
    })

    this.client.on("error", (error: Error) => {
      console.error("Redis connection error:", error)
    })

    this.client.on("connect", () => {
      console.log("Redis connected successfully")
    })
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient()
    }
    return RedisClient.instance
  }

  public async get<T = string>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  public async set(
    key: string, 
    value: unknown, 
    ttlSeconds: number = env.CACHE_TTL
  ): Promise<boolean> {
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error)
      return false
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error)
      return false
    }
  }

  public async flush(): Promise<boolean> {
    try {
      await this.client.flushdb()
      return true
    } catch (error) {
      console.error("Redis FLUSH error:", error)
      return false
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit()
  }

  public getClient(): Redis {
    return this.client
  }
}

export const redisClient = RedisClient.getInstance()