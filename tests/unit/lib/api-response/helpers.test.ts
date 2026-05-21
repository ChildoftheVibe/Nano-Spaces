import { describe, it, expect } from 'vitest'
import { success, failure } from '@/lib/api-response/helpers'
import { AppError } from '@/lib/errors/AppError'

const reqId = 'req-123'

describe('success()', () => {
  it('returns 200 with success:true and data', async () => {
    const res = success({ id: 1, name: 'Alice' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, data: { id: 1, name: 'Alice' } })
  })

  it('passes custom init options', async () => {
    const res = success({ ok: true }, { status: 201 })
    expect(res.status).toBe(201)
  })

  it('works with null data', async () => {
    const res = success(null)
    const body = await res.json()
    expect(body).toEqual({ success: true, data: null })
  })

  it('works with array data', async () => {
    const res = success([1, 2, 3])
    const body = await res.json()
    expect(body).toEqual({ success: true, data: [1, 2, 3] })
  })
})

describe('failure()', () => {
  it('returns error shape with correct fields', async () => {
    const err = new AppError({
      code: 'VALIDATION_ERROR',
      userMessage: 'Email is invalid',
      httpStatus: 400,
      requestId: reqId,
    })
    const res = failure(err, 400)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email is invalid',
        requestId: reqId,
      },
    })
  })

  it('includes details when present', async () => {
    const err = new AppError({
      code: 'VALIDATION_ERROR',
      userMessage: 'Bad',
      httpStatus: 400,
      requestId: reqId,
      details: [{ field: 'email', issue: 'invalid' }],
    })
    const res = failure(err, 400)
    const body = await res.json()
    expect(body.error.details).toEqual([{ field: 'email', issue: 'invalid' }])
  })

  it('omits details when undefined', async () => {
    const err = new AppError({
      code: 'AUTH_ERROR',
      userMessage: 'Unauthorized',
      httpStatus: 401,
      requestId: reqId,
    })
    const res = failure(err, 401)
    const body = await res.json()
    expect('details' in body.error).toBe(false)
  })

  it('uses the provided status code', async () => {
    const err = new AppError({
      code: 'NOT_FOUND',
      userMessage: 'Not found',
      httpStatus: 404,
      requestId: reqId,
    })
    const res = failure(err, 404)
    expect(res.status).toBe(404)
  })
})
