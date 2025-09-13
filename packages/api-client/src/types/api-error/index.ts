export interface ApiError extends Error {
  status?: number
  statusText?: string
  code?: string
  operation?: string
  field?: string
  data?: unknown
  requestId?: string
  timestamp?: number
}