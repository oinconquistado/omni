export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
  port: process.env.PORT || '3000'
} as const

export type Config = typeof config