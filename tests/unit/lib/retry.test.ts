import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry } from '@/lib/retry'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

const reqId = 'req-test'

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on generic error and succeeds on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered')

    const promise = withRetry(fn, { baseMs: 100 })
    // Advance past the first delay (100ms * 2^0 = 100ms)
    await vi.advanceTimersByTimeAsync(200)
    const result = await promise
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws after maxAttempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    const promise = withRetry(fn, { maxAttempts: 3, baseMs: 100 })
    // Attach rejection handler before advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow('always fails')
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws immediately on 4xx AuthError without retrying', async () => {
    const authErr = new AuthError({ userMessage: 'Unauthorized', requestId: reqId })
    const fn = vi.fn().mockRejectedValue(authErr)
    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow(authErr)
    // Should not retry — called only once
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws immediately on 4xx ValidationError without retrying', async () => {
    const valErr = new ValidationError({ userMessage: 'Bad input', requestId: reqId })
    const fn = vi.fn().mockRejectedValue(valErr)
    await expect(withRetry(fn, { maxAttempts: 5 })).rejects.toThrow(valErr)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('respects custom maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('5xx'))
    const promise = withRetry(fn, { maxAttempts: 2, baseMs: 50 })
    const assertion = expect(promise).rejects.toThrow('5xx')
    await vi.advanceTimersByTimeAsync(200)
    await assertion
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('succeeds on the final allowed attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('finally')

    const promise = withRetry(fn, { maxAttempts: 3, baseMs: 50 })
    await vi.advanceTimersByTimeAsync(500)
    const result = await promise
    expect(result).toBe('finally')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
