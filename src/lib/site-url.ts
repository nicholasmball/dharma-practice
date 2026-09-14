/**
 * Canonical public site URL.
 *
 * Single source of truth so the app has no host assumptions baked in — this
 * matters for the Mac mini migration, where the app moves off Vercel and is
 * served behind Cloudflare on a new hostname. Set NEXT_PUBLIC_SITE_URL per
 * environment; the fallback is the current production domain.
 */
export function siteUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://buddha-balla.com').replace(/\/+$/, '')
  if (!path) return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
