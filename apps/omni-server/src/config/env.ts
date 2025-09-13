import { z } from "zod"

const envSchema = z.object({
  OMNI_DATABASE_URL: z.url(),
  SHARED_DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  CACHE_TTL: z.coerce.number().default(3600),
  CACHE_PREFIX: z.string().default("omni:"),
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
