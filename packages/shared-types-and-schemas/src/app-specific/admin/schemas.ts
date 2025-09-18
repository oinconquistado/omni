import { z } from "zod"

// Base schemas
export const userRoleSchema = z.enum(["ADMIN", "SUPPORT"])
export const userStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"])

// Strong password validation
const strongPasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial")

// Complete user schema
export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().min(1),
  password: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Login schema
export const userLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

// Create user schema (omit auto-generated fields)
export const createUserSchema = userSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    password: strongPasswordSchema,
    status: userStatusSchema.optional().default("ACTIVE"),
  })

// Update user schema (all fields optional except id)
export const updateUserSchema = createUserSchema.partial().extend({
  password: strongPasswordSchema.optional(),
})

// Params schema
export const userParamsSchema = z.object({
  id: z.string(),
})

// Public user schema (without password)
export const publicUserSchema = userSchema.omit({ password: true })
