import type { HttpMethod } from "@/types/http-method/index.js"

export interface RequestMetrics {
  requestId: string
  method: HttpMethod
  url: string
  startTime: number
  endTime: number
  duration: number
  status?: number
  success: boolean
  cached: boolean
  retryCount: number
  error?: string
}