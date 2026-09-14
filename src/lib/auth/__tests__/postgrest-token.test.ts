import { jwtVerify } from 'jose'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mintPostgrestToken } from '../postgrest-token'

const TEST_SECRET = 'test-only-postgrest-secret-does-not-match-any-real-mini'
const TEST_USER_ID = '9f1b6a2e-4d3c-4a5b-8e7f-1a2b3c4d5e6f'

describe('mintPostgrestToken', () => {
  const originalSecret = process.env.POSTGREST_JWT_SECRET

  beforeEach(() => {
    process.env.POSTGREST_JWT_SECRET = TEST_SECRET
  })

  afterEach(() => {
    process.env.POSTGREST_JWT_SECRET = originalSecret
  })

  it('produces a token with sub, role, and a short expiry', async () => {
    const before = Math.floor(Date.now() / 1000)
    const token = await mintPostgrestToken(TEST_USER_ID)
    const after = Math.floor(Date.now() / 1000)

    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(TEST_SECRET))

    expect(protectedHeader.alg).toBe('HS256')
    expect(payload.sub).toBe(TEST_USER_ID)
    expect(payload.role).toBe('authenticated')
    expect(typeof payload.iat).toBe('number')
    expect(typeof payload.exp).toBe('number')

    // Short-lived per requirements section 9 ("minutes, not days") — assert
    // it's a few minutes, not hours or days.
    const ttlSeconds = (payload.exp as number) - (payload.iat as number)
    expect(ttlSeconds).toBeGreaterThan(0)
    expect(ttlSeconds).toBeLessThanOrEqual(10 * 60)

    // iat/exp should be anchored to "now", not some fixed/stale value.
    expect(payload.iat as number).toBeGreaterThanOrEqual(before)
    expect(payload.iat as number).toBeLessThanOrEqual(after)
  })

  it('rejects verification against the wrong secret', async () => {
    const token = await mintPostgrestToken(TEST_USER_ID)

    await expect(
      jwtVerify(token, new TextEncoder().encode('a-completely-different-secret'))
    ).rejects.toThrow()
  })

  it('throws instead of minting a token when POSTGREST_JWT_SECRET is unset', async () => {
    delete process.env.POSTGREST_JWT_SECRET

    await expect(mintPostgrestToken(TEST_USER_ID)).rejects.toThrow('POSTGREST_JWT_SECRET')
  })
})
