import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  AuthError,
  RateLimitError,
  NotFoundError,
  BookingConflictError,
  TierLimitError,
  ExternalServiceError,
  ConflictError,
} from '@/lib/errors/AppError'

const reqId = 'test-request-id'

describe('AppError base class', () => {
  it('stores all constructor params', () => {
    const err = new AppError({
      code: 'CUSTOM_ERROR',
      userMessage: 'Something went wrong',
      httpStatus: 500,
      requestId: reqId,
    })
    expect(err.code).toBe('CUSTOM_ERROR')
    expect(err.userMessage).toBe('Something went wrong')
    expect(err.httpStatus).toBe(500)
    expect(err.requestId).toBe(reqId)
    expect(err.message).toBe('Something went wrong')
  })

  it('stores optional details', () => {
    const details = { field: 'email' }
    const err = new AppError({
      code: 'X',
      userMessage: 'err',
      httpStatus: 400,
      requestId: reqId,
      details,
    })
    expect(err.details).toEqual(details)
  })

  it('is an instance of Error', () => {
    const err = new AppError({
      code: 'X',
      userMessage: 'err',
      httpStatus: 400,
      requestId: reqId,
    })
    expect(err).toBeInstanceOf(Error)
  })
})

describe('ValidationError', () => {
  it('has correct code and httpStatus', () => {
    const err = new ValidationError({ userMessage: 'Bad input', requestId: reqId })
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.httpStatus).toBe(400)
    expect(err.name).toBe('ValidationError')
  })

  it('is an instance of AppError', () => {
    expect(new ValidationError({ userMessage: 'x', requestId: reqId })).toBeInstanceOf(AppError)
  })
})

describe('AuthError', () => {
  it('has code AUTH_ERROR and status 401', () => {
    const err = new AuthError({ userMessage: 'Not authenticated', requestId: reqId })
    expect(err.code).toBe('AUTH_ERROR')
    expect(err.httpStatus).toBe(401)
    expect(err.name).toBe('AuthError')
  })
})

describe('RateLimitError', () => {
  it('has code RATE_LIMIT_ERROR and status 429', () => {
    const err = new RateLimitError({ userMessage: 'Too many requests', requestId: reqId })
    expect(err.code).toBe('RATE_LIMIT_ERROR')
    expect(err.httpStatus).toBe(429)
  })
})

describe('NotFoundError', () => {
  it('has code NOT_FOUND and status 404', () => {
    const err = new NotFoundError({ userMessage: 'Resource not found', requestId: reqId })
    expect(err.code).toBe('NOT_FOUND')
    expect(err.httpStatus).toBe(404)
  })
})

describe('BookingConflictError', () => {
  it('has code BOOKING_CONFLICT and status 409', () => {
    const err = new BookingConflictError({ userMessage: 'Slot taken', requestId: reqId })
    expect(err.code).toBe('BOOKING_CONFLICT')
    expect(err.httpStatus).toBe(409)
  })
})

describe('TierLimitError', () => {
  it('has code TIER_LIMIT and status 402', () => {
    const err = new TierLimitError({ userMessage: 'Upgrade required', requestId: reqId })
    expect(err.code).toBe('TIER_LIMIT')
    expect(err.httpStatus).toBe(402)
  })
})

describe('ExternalServiceError', () => {
  it('has code EXTERNAL_SERVICE_ERROR and status 502', () => {
    const err = new ExternalServiceError({ userMessage: 'Downstream failure', requestId: reqId })
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect(err.httpStatus).toBe(502)
  })
})

describe('ConflictError', () => {
  it('has code CONFLICT and status 409', () => {
    const err = new ConflictError({ userMessage: 'Duplicate', requestId: reqId })
    expect(err.code).toBe('CONFLICT')
    expect(err.httpStatus).toBe(409)
  })
})
