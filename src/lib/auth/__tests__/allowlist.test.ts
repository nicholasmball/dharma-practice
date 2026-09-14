import { describe, expect, it } from 'vitest'
import { isEmailAllowed } from '../allowlist'

describe('isEmailAllowed', () => {
  const allowlist = 'alice@example.com, Bob@Example.com ,carol@example.com'

  it('accepts an email that is on the allowlist', () => {
    expect(isEmailAllowed('alice@example.com', allowlist)).toBe(true)
  })

  it('is case-insensitive and trims whitespace on both sides', () => {
    expect(isEmailAllowed('  BOB@EXAMPLE.COM  ', allowlist)).toBe(true)
  })

  it('rejects an email that is not on the allowlist', () => {
    expect(isEmailAllowed('mallory@example.com', allowlist)).toBe(false)
  })

  it('rejects everything when the allowlist is unset', () => {
    expect(isEmailAllowed('alice@example.com', undefined)).toBe(false)
  })

  it('rejects everything when the allowlist is an empty string', () => {
    expect(isEmailAllowed('alice@example.com', '')).toBe(false)
  })

  it('ignores stray commas/blank entries in the allowlist', () => {
    expect(isEmailAllowed('carol@example.com', 'alice@example.com,,carol@example.com,')).toBe(true)
  })
})
