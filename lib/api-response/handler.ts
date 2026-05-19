import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { AppError } from '@/lib/errors/AppError'
import { failure } from './helpers'

// Permissive enough to cover both static and dynamic route segments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params?: any }
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>

function generateRequestId(): string {
  return crypto.randomUUID()
}

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    const requestId = generateRequestId()
    try {
      return await handler(req, ctx)
    } catch (error) {
      if (error instanceof AppError) {
        Sentry.captureException(error, {
          extra: { requestId, code: error.code },
        })
        return failure(error, error.httpStatus)
      }

      const requestError = error instanceof Error ? error : new Error(String(error))
      Sentry.captureException(requestError, { extra: { requestId } })

      const genericError = new AppError({
        code: 'INTERNAL_SERVER_ERROR',
        userMessage: 'An unexpected error occurred. Please try again later.',
        httpStatus: 500,
        requestId,
      })
      return failure(genericError, 500)
    }
  }
}
