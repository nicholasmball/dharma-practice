import { describe, expect, it, vi } from 'vitest'
import { resolveSignIn } from '../resolve-sign-in'

describe('resolveSignIn', () => {
  it('refuses an email that is not on the allowlist, without looking it up', async () => {
    const findUserIdByEmail = vi.fn()

    const result = await resolveSignIn('outsider@example.com', {
      isEmailAllowed: () => false,
      findUserIdByEmail,
    })

    expect(result).toEqual({ allowed: false, userId: null })
    expect(findUserIdByEmail).not.toHaveBeenCalled()
  })

  it('refuses an allowlisted email with no matching auth.users row (Story 2)', async () => {
    const result = await resolveSignIn('new-invitee@example.com', {
      isEmailAllowed: () => true,
      findUserIdByEmail: async () => null,
    })

    expect(result).toEqual({ allowed: false, userId: null })
  })

  it('signs in an allowlisted email that maps to an existing account', async () => {
    const result = await resolveSignIn('returning-user@example.com', {
      isEmailAllowed: () => true,
      findUserIdByEmail: async () => 'a4c8f2f0-1111-4c3a-9c8e-2d5f9a0b7e11',
    })

    expect(result).toEqual({ allowed: true, userId: 'a4c8f2f0-1111-4c3a-9c8e-2d5f9a0b7e11' })
  })

  it('refuses when there is no email at all', async () => {
    const findUserIdByEmail = vi.fn()

    const result = await resolveSignIn(null, {
      isEmailAllowed: () => true,
      findUserIdByEmail,
    })

    expect(result).toEqual({ allowed: false, userId: null })
    expect(findUserIdByEmail).not.toHaveBeenCalled()
  })
})
