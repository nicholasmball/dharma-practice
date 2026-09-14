// Gate for who is allowed to sign in at all, per requirements section 6.
// AUTH_ALLOWED_EMAILS is a comma-separated list; entries are compared
// lower-cased and trimmed so formatting differences in the env value never
// cause a false rejection.

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set()

  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  )
}

export function isEmailAllowed(email: string, allowlistEnv = process.env.AUTH_ALLOWED_EMAILS): boolean {
  const allowlist = parseAllowlist(allowlistEnv)
  return allowlist.has(email.trim().toLowerCase())
}
