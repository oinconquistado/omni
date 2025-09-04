import type { User, Session } from "../generated/prisma/index.js"

export type { User, Session }

export interface CacheableData<T = unknown> {
  data: T
  timestamp: number
  ttl: number
}

export interface DatabaseOperationOptions {
  useCache?: boolean
  cacheTtl?: number
  cacheKey?: string
}

export interface CacheFirst<T> {
  get: (id: string, options?: DatabaseOperationOptions) => Promise<T | null>
  set: (id: string, data: T, options?: DatabaseOperationOptions) => Promise<boolean>
  delete: (id: string) => Promise<boolean>
  flush: () => Promise<boolean>
}

export interface UserWithSessions extends User {
  sessions: Session[]
}

export type CreateUserData = Pick<User, "email"> & { name: string | null }
export type UpdateUserData = Partial<Pick<User, "name" | "email">>
export type CreateSessionData = Pick<Session, "userId" | "token" | "expiresAt">