export class AppError extends Error {
  readonly code: string
  readonly userMessage: string
  readonly httpStatus: number
  readonly details?: unknown
  readonly requestId: string

  constructor(params: {
    code: string
    userMessage: string
    httpStatus: number
    details?: unknown
    requestId: string
  }) {
    super(params.userMessage)
    this.name = 'AppError'
    this.code = params.code
    this.userMessage = params.userMessage
    this.httpStatus = params.httpStatus
    this.requestId = params.requestId
    if (params.details !== undefined) {
      this.details = params.details
    }
  }
}

export class ValidationError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'VALIDATION_ERROR', httpStatus: 400 })
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'AUTH_ERROR', httpStatus: 401 })
    this.name = 'AuthError'
  }
}

export class RateLimitError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'RATE_LIMIT_ERROR', httpStatus: 429 })
    this.name = 'RateLimitError'
  }
}

export class NotFoundError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'NOT_FOUND', httpStatus: 404 })
    this.name = 'NotFoundError'
  }
}

export class BookingConflictError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'BOOKING_CONFLICT', httpStatus: 409 })
    this.name = 'BookingConflictError'
  }
}

export class TierLimitError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'TIER_LIMIT', httpStatus: 402 })
    this.name = 'TierLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'EXTERNAL_SERVICE_ERROR', httpStatus: 502 })
    this.name = 'ExternalServiceError'
  }
}

export class ConflictError extends AppError {
  constructor(params: { userMessage: string; details?: unknown; requestId: string }) {
    super({ ...params, code: 'CONFLICT', httpStatus: 409 })
    this.name = 'ConflictError'
  }
}
