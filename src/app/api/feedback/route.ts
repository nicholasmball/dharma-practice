import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

let resend: Resend | null = null

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// In-memory rate limiter (per user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 3 // max feedback submissions per window
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

const VALID_TYPES = ['bug', 'feature', 'feedback', 'question'] as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'You\'ve sent too many messages recently. Please wait a few minutes before trying again.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    let body: { type?: unknown; message?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { type, message } = body

    // Validate type
    if (typeof type !== 'string' || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid feedback type.' }, { status: 400 })
    }

    // Validate message
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message is too long (max 5000 characters).' }, { status: 400 })
    }

    const typeLabels: Record<string, string> = {
      bug: 'Bug Report',
      feature: 'Feature Request',
      feedback: 'General Feedback',
      question: 'Question',
    }

    const { error } = await getResend().emails.send({
      from: 'balladharma <feedback@buddha-balla.com>',
      to: process.env.FEEDBACK_EMAIL || 'privacy@buddha-balla.com',
      subject: `[${typeLabels[type]}] New feedback from ${user.email}`,
      text: `Type: ${typeLabels[type]}\nFrom: ${user.email}\nUser ID: ${user.id}\n\n${message.trim()}`,
    })

    if (error) {
      console.error('Resend error:', error.message)
      return NextResponse.json(
        { error: 'Failed to send feedback. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Feedback API error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
}
