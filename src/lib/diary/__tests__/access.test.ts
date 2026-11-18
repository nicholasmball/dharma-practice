import { describe, expect, it } from 'vitest'
import { isDiaryUser } from '../access'

describe('isDiaryUser', () => {
  it('lets in an email on the list, ignoring case and spaces', () => {
    expect(isDiaryUser('  Nick@Example.com ', 'other@example.com, nick@example.com')).toBe(true)
  })

  it('keeps out an email that is not on the list', () => {
    expect(isDiaryUser('friend@example.com', 'nick@example.com')).toBe(false)
  })

  it('lets nobody in when the setting is empty or missing', () => {
    expect(isDiaryUser('nick@example.com', '')).toBe(false)
    expect(isDiaryUser('nick@example.com', undefined)).toBe(false)
  })

  it('keeps out a missing email', () => {
    expect(isDiaryUser(null, 'nick@example.com')).toBe(false)
    expect(isDiaryUser(undefined, 'nick@example.com')).toBe(false)
  })
})
