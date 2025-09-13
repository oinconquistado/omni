export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  type?: string
  operation?: string
  timestamp?: number
  requestId?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
