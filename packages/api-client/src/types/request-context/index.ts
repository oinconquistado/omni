export interface RequestContext {
  requestId: string
  timestamp: number
  abortController: AbortController
  retryCount: number
  startTime: number
}