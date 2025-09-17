export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ResponseData<T = unknown> {
  data: T
  meta?: PaginationMeta
}

export interface ResponseError {
  code: string
  message: string
  details?: Record<string, unknown>
  stack?: string
}

export interface BaseResponse {
  success: boolean
  timestamp: number
  requestId?: string
}

export interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ErrorResponse extends BaseResponse {
  success: false
  error: ResponseError
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse
