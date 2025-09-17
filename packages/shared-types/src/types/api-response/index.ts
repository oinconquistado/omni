export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiError {
  code: string
  message: string
  userMessage?: string
  details?: Record<string, unknown>
  stack?: string
}

export interface BaseApiResponse {
  success: boolean
  timestamp: number
  requestId?: string
}

export interface SuccessApiResponse<T = unknown> extends BaseApiResponse {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ErrorApiResponse extends BaseApiResponse {
  success: false
  error: ApiError
}

export type ApiResponse<T = unknown> = SuccessApiResponse<T> | ErrorApiResponse

export interface PaginatedResponse<T> extends SuccessApiResponse<T[]> {
  meta: PaginationMeta
}
