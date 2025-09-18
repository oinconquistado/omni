import type { z } from "zod"

import type {
  createUserSchema,
  publicUserSchema,
  updateUserSchema,
  userLoginSchema,
  userRoleSchema,
  userSchema,
  userStatusSchema,
} from "./schemas"

// Generate TypeScript types from Zod schemas
export type UserRole = z.infer<typeof userRoleSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>
export type UserLogin = z.infer<typeof userLoginSchema>
export type PublicUser = z.infer<typeof publicUserSchema>

// Response types
export interface UserLoginResponse {
  user: PublicUser
  token?: string
}
