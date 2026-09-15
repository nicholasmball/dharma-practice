import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: queryMock,
  })),
}))

describe('deleteUserAccount', () => {
  const originalUrl = process.env.DATABASE_URL

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test'
    queryMock.mockReset()
  })

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl
    vi.resetModules()
  })

  it('deletes the auth.users row for the given id', async () => {
    queryMock.mockResolvedValue({ rows: [] })

    const { deleteUserAccount } = await import('../delete-user')
    const result = await deleteUserAccount('9f1b6a2e-4d3c-4a5b-8e7f-1a2b3c4d5e6f')

    expect(result).toEqual({ success: true })
    expect(queryMock).toHaveBeenCalledWith(
      'delete from auth.users where id = $1',
      ['9f1b6a2e-4d3c-4a5b-8e7f-1a2b3c4d5e6f']
    )
  })

  it('returns an error instead of throwing when no user id is provided', async () => {
    const { deleteUserAccount } = await import('../delete-user')
    const result = await deleteUserAccount('')

    expect(result).toEqual({ error: 'No authenticated user ID provided' })
    expect(queryMock).not.toHaveBeenCalled()
  })
})
