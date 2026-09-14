import { NextResponse } from 'next/server'

// Lightweight, unauthenticated health check.
// Used by the Mac mini's launchd service supervisor and the Cloudflare
// tunnel/Access health probe to confirm the app process is up.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
