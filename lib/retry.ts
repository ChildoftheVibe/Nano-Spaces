import { AppError } from './errors/AppError'

type RetryOptions = {
  maxAttempts?: number
  baseMs?: number
}

function isClientError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.httpStatus >= 400 && error.httpStatus < 500
  }
  return false
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseMs = 1000 } = options
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Throw immediately on 4xx — not retriable
      if (isClientError(error)) {
        throw error
      }

      if (attempt === maxAttempts) break

      // Exponential backoff: 1s, 2s, 4s, ...
      await delay(baseMs * Math.pow(2, attempt - 1))
    }
  }

  throw lastError
}
