import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the admin client before importing tiers
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createSessionClient: vi.fn(),
}))

import { checkRoomLimit, checkAdminLimit, checkUserLimit } from '@/lib/tiers'
import { createAdminClient } from '@/lib/supabase/server'

function makeAdminMock(orgData: Record<string, unknown>, count: number) {
  const countChainResult = Promise.resolve({ count, error: null })
  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  Object.defineProperty(countChain, 'then', {
    value: (onFulfilled: (v: unknown) => unknown) => countChainResult.then(onFulfilled),
  })

  const orgChainResult = Promise.resolve({ data: orgData, error: null })
  const orgChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(orgChainResult),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'organizations') return orgChain
      return countChain
    }),
  }
}

const mockedCreateAdmin = vi.mocked(createAdminClient)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkRoomLimit', () => {
  it('allows when under the limit', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_room_limit: 5 }, 3) as unknown as ReturnType<typeof createAdminClient>,
    )
    const result = await checkRoomLimit('org-1')
    expect(result.allowed).toBe(true)
    expect(result.current).toBe(3)
    expect(result.limit).toBe(5)
  })

  it('blocks when at the limit', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_room_limit: 3 }, 3) as unknown as ReturnType<typeof createAdminClient>,
    )
    const result = await checkRoomLimit('org-1')
    expect(result.allowed).toBe(false)
    expect(result.current).toBe(3)
    expect(result.limit).toBe(3)
  })

  it('allows unlimited when tier_room_limit is null', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_room_limit: null }, 100) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    const result = await checkRoomLimit('org-1')
    expect(result.allowed).toBe(true)
    expect(result.limit).toBeNull()
  })
})

describe('checkAdminLimit', () => {
  it('allows when under the admin limit', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_admin_limit: 3 }, 1) as unknown as ReturnType<typeof createAdminClient>,
    )
    const result = await checkAdminLimit('org-1')
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(3)
  })

  it('blocks when at the admin limit', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_admin_limit: 2 }, 2) as unknown as ReturnType<typeof createAdminClient>,
    )
    const result = await checkAdminLimit('org-1')
    expect(result.allowed).toBe(false)
  })

  it('allows unlimited admins when limit is null', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_admin_limit: null }, 50) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    const result = await checkAdminLimit('org-1')
    expect(result.allowed).toBe(true)
  })
})

describe('checkUserLimit', () => {
  it('allows when under the user limit', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_user_limit: 50 }, 20) as unknown as ReturnType<typeof createAdminClient>,
    )
    const result = await checkUserLimit('org-1')
    expect(result.allowed).toBe(true)
    expect(result.current).toBe(20)
    expect(result.limit).toBe(50)
  })

  it('blocks when at the user limit', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_user_limit: 10 }, 10) as unknown as ReturnType<typeof createAdminClient>,
    )
    const result = await checkUserLimit('org-1')
    expect(result.allowed).toBe(false)
  })

  it('allows unlimited users when limit is null', async () => {
    mockedCreateAdmin.mockReturnValue(
      makeAdminMock({ tier_user_limit: null }, 999) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    const result = await checkUserLimit('org-1')
    expect(result.allowed).toBe(true)
    expect(result.limit).toBeNull()
  })
})
