import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TEST_USER = { id: '9f1b6a2e-4d3c-4a5b-8e7f-1a2b3c4d5e6f', email: 'practitioner@example.com' }

const getCurrentUserMock = vi.fn()
const mintPostgrestTokenMock = vi.fn()

vi.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUser: getCurrentUserMock,
}))

vi.mock('@/lib/auth/postgrest-token', () => ({
  mintPostgrestToken: mintPostgrestTokenMock,
}))

describe('createClient', () => {
  const originalUrl = process.env.POSTGREST_URL

  beforeEach(() => {
    process.env.POSTGREST_URL = 'http://127.0.0.1:8097'
    getCurrentUserMock.mockReset()
    mintPostgrestTokenMock.mockReset()
  })

  afterEach(() => {
    process.env.POSTGREST_URL = originalUrl
  })

  it('attaches a minted bearer token for a signed-in user and builds a query with the same .from().select() shape', async () => {
    getCurrentUserMock.mockResolvedValue(TEST_USER)
    mintPostgrestTokenMock.mockResolvedValue('signed.jwt.token')

    const { createClient } = await import('../client')
    const supabase = await createClient()

    expect(mintPostgrestTokenMock).toHaveBeenCalledWith(TEST_USER.id)

    // Same query-builder shape existing call sites already use.
    const query = supabase.from('journal_entries').select('*').eq('user_id', TEST_USER.id)
    const headers = (query as unknown as { headers: Headers }).headers

    expect(headers.get('Authorization')).toBe('Bearer signed.jwt.token')
  })

  it('omits the Authorization header (anonymous request) when there is no signed-in user', async () => {
    getCurrentUserMock.mockResolvedValue(null)

    const { createClient } = await import('../client')
    const supabase = await createClient()

    expect(mintPostgrestTokenMock).not.toHaveBeenCalled()

    const query = supabase.from('journal_entries').select('*')
    const headers = (query as unknown as { headers: Headers }).headers

    expect(headers.get('Authorization')).toBeNull()
  })

  it('throws instead of building a client when POSTGREST_URL is unset', async () => {
    delete process.env.POSTGREST_URL
    getCurrentUserMock.mockResolvedValue(null)

    const { createClient } = await import('../client')

    await expect(createClient()).rejects.toThrow('POSTGREST_URL')
  })
})
