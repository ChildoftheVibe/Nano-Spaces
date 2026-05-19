import type { ApiSuccess, ApiError } from './types'
import type { AppError } from '@/lib/errors/AppError'

export function success<T>(data: T, init?: ResponseInit): Response {
  const body: ApiSuccess<T> = { success: true, data }
  return Response.json(body, init)
}

export function failure(error: AppError, status: number): Response {
  const body: ApiError = {
    success: false,
    error: {
      code: error.code,
      message: error.userMessage,
      requestId: error.requestId,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  }
  return Response.json(body, { status })
}
