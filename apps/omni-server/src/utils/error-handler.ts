export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "DatabaseError"
  }
}

export class CacheError extends Error {
  constructor(
    message: string,
    public readonly key: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "CacheError"
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function createErrorResponse(error: Error) {
  return {
    success: false,
    error: error.message,
    type: error.name,
    ...(error instanceof DatabaseError && { operation: error.operation }),
    ...(error instanceof CacheError && { cacheKey: error.key }),
    ...(error instanceof ValidationError && { field: error.field }),
  }
}

export async function handleAsyncError<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    console.error("Async operation failed:", error)
    return null
  }
}
