import type {
  CacheFirst,
  CreateSessionData,
  CreateUserData,
  DatabaseOperationOptions,
  Session,
  UpdateUserData,
  User,
  UserWithSessions,
} from "../types/database.js"
import { prisma } from "./prisma-client.js"
import { redisClient } from "./redis-client.js"

class DatabaseService implements CacheFirst<User | Session | UserWithSessions> {
  private generateCacheKey(entity: string, id: string): string {
    return `${entity}:${id}`
  }

  public async get<T>(id: string, options: DatabaseOperationOptions = {}): Promise<T | null> {
    const { useCache = true, cacheKey } = options
    const key = cacheKey || id

    if (useCache) {
      const cached = await redisClient.get<T>(key)
      if (cached) {
        console.log(`Cache HIT for key: ${key}`)
        return cached
      }
      console.log(`Cache MISS for key: ${key}`)
    }

    return null
  }

  public async set<T>(id: string, data: T, options: DatabaseOperationOptions = {}): Promise<boolean> {
    const { cacheTtl, cacheKey } = options
    const key = cacheKey || id

    return await redisClient.set(key, data, cacheTtl)
  }

  public async delete(id: string): Promise<boolean> {
    return await redisClient.delete(id)
  }

  public async flush(): Promise<boolean> {
    return await redisClient.flush()
  }

  // User operations
  public async getUserById(id: string, options: DatabaseOperationOptions = {}): Promise<User | null> {
    const cacheKey = this.generateCacheKey("user", id)
    const cached = await this.get<User>(id, { ...options, cacheKey })

    if (cached) return cached

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      })

      if (user && options.useCache !== false) {
        await this.set(id, user, { ...options, cacheKey })
      }

      return user
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error)
      return null
    }
  }

  public async getUserByEmail(email: string, options: DatabaseOperationOptions = {}): Promise<User | null> {
    const cacheKey = this.generateCacheKey("user:email", email)
    const cached = await this.get<User>(email, { ...options, cacheKey })

    if (cached) return cached

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (user && options.useCache !== false) {
        await this.set(email, user, { ...options, cacheKey })
        // Cache by ID as well
        await this.set(user.id, user, {
          ...options,
          cacheKey: this.generateCacheKey("user", user.id),
        })
      }

      return user
    } catch (error) {
      console.error(`Error fetching user by email ${email}:`, error)
      return null
    }
  }

  public async getUserWithSessions(
    id: string,
    options: DatabaseOperationOptions = {},
  ): Promise<UserWithSessions | null> {
    const cacheKey = this.generateCacheKey("user:sessions", id)
    const cached = await this.get<UserWithSessions>(id, { ...options, cacheKey })

    if (cached) return cached

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { sessions: true },
      })

      if (user && options.useCache !== false) {
        await this.set(id, user, { ...options, cacheKey })
      }

      return user
    } catch (error) {
      console.error(`Error fetching user with sessions ${id}:`, error)
      return null
    }
  }

  public async createUser(data: CreateUserData, options: DatabaseOperationOptions = {}): Promise<User | null> {
    try {
      const user = await prisma.user.create({ data })

      if (options.useCache !== false) {
        const userCacheKey = this.generateCacheKey("user", user.id)
        const emailCacheKey = this.generateCacheKey("user:email", user.email)

        await Promise.all([
          this.set(user.id, user, { ...options, cacheKey: userCacheKey }),
          this.set(user.email, user, { ...options, cacheKey: emailCacheKey }),
        ])
      }

      return user
    } catch (error) {
      console.error("Error creating user:", error)
      return null
    }
  }

  public async updateUser(
    id: string,
    data: UpdateUserData,
    options: DatabaseOperationOptions = {},
  ): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
      })

      if (options.useCache !== false) {
        // Update all cache entries for this user
        const userCacheKey = this.generateCacheKey("user", user.id)
        const emailCacheKey = this.generateCacheKey("user:email", user.email)
        const sessionsKey = this.generateCacheKey("user:sessions", user.id)

        await Promise.all([
          this.set(user.id, user, { ...options, cacheKey: userCacheKey }),
          this.set(user.email, user, { ...options, cacheKey: emailCacheKey }),
          this.delete(sessionsKey), // Invalidate sessions cache
        ])
      }

      return user
    } catch (error) {
      console.error(`Error updating user ${id}:`, error)
      return null
    }
  }

  public async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } })

      // Clean up cache
      const userCacheKey = this.generateCacheKey("user", id)
      const sessionsKey = this.generateCacheKey("user:sessions", id)

      await Promise.all([this.delete(userCacheKey), this.delete(sessionsKey)])

      return true
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      return false
    }
  }

  // Session operations
  public async getSessionByToken(token: string, options: DatabaseOperationOptions = {}): Promise<Session | null> {
    const cacheKey = this.generateCacheKey("session:token", token)
    const cached = await this.get<Session>(token, { ...options, cacheKey })

    if (cached) return cached

    try {
      const session = await prisma.session.findUnique({
        where: { token },
      })

      if (session && options.useCache !== false) {
        await this.set(token, session, { ...options, cacheKey })
      }

      return session
    } catch (error) {
      console.error(`Error fetching session by token:`, error)
      return null
    }
  }

  public async createSession(data: CreateSessionData, options: DatabaseOperationOptions = {}): Promise<Session | null> {
    try {
      const session = await prisma.session.create({ data })

      if (options.useCache !== false) {
        const tokenCacheKey = this.generateCacheKey("session:token", session.token)
        await this.set(session.token, session, { ...options, cacheKey: tokenCacheKey })

        // Invalidate user sessions cache
        const userSessionsKey = this.generateCacheKey("user:sessions", session.userId)
        await this.delete(userSessionsKey)
      }

      return session
    } catch (error) {
      console.error("Error creating session:", error)
      return null
    }
  }

  public async deleteSession(token: string): Promise<boolean> {
    try {
      const session = await prisma.session.findUnique({ where: { token } })
      if (!session) return false

      await prisma.session.delete({ where: { token } })

      // Clean up cache
      const tokenCacheKey = this.generateCacheKey("session:token", token)
      const userSessionsKey = this.generateCacheKey("user:sessions", session.userId)

      await Promise.all([this.delete(tokenCacheKey), this.delete(userSessionsKey)])

      return true
    } catch (error) {
      console.error("Error deleting session:", error)
      return false
    }
  }
}

export const databaseService = new DatabaseService()
