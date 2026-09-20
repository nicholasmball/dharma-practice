import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'
import {
  TEACHER_SYSTEM_PROMPT,
  TEACHER_BACKGROUND_INTRO,
  buildBackgroundBlock,
  assembleSystemPrompt,
  isFollowUpTurn,
} from '@/lib/teacher/prompt'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Models the mini's local dharma-llm service will accept in the ballabot `model` field.
const TEACHER_MODEL_ALLOWLIST = ['claude-sonnet-5', 'claude-opus-5']

// In-memory rate limiter (per user)
// Tracks: { [userId]: { count: number, resetTime: number }[] }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 10 // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

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

// Clean up stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000) // every 5 minutes

// Validate messages array
function validateMessages(messages: unknown): messages is Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) return false
  if (messages.length === 0 || messages.length > 50) return false

  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) return false
    if (typeof msg.role !== 'string' || typeof msg.content !== 'string') return false
    if (msg.role !== 'user' && msg.role !== 'assistant') return false
    if (msg.content.length === 0 || msg.content.length > 10000) return false
  }

  return true
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'You\'re sending messages too quickly. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    let body: { messages?: unknown; includeContext?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { messages, includeContext } = body

    // Validate messages
    if (!validateMessages(messages)) {
      return NextResponse.json(
        { error: 'Invalid message format. Please refresh and try again.' },
        { status: 400 }
      )
    }

    // Build context from user's practice data if requested
    let contextMessage = ''

    if (includeContext) {
      const db = await createClient()

      // Get recent sessions
      const { data: sessions } = await db
        .from('meditation_sessions')
        .select('*')
        .eq('completed', true)
        .order('started_at', { ascending: false })
        .limit(10)

      // Get the practitioner's most recent journal entries, in FULL (never
      // truncated). Deliberately kept to a small number so the teacher works
      // from a light recent snapshot rather than the whole diary. The complete
      // history still lives in the database and can be surfaced on demand by a
      // future retrieval step — see the "teacher voice/style" task.
      const { data: entries } = await db
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      // The background goes out with every message, but under a quieter intro
      // from the second turn on, so the teacher doesn't keep returning to the
      // same notes. See src/lib/teacher/prompt.ts (isFollowUpTurn) and
      // docs/teacher-voice-approved-wording.md ("Changes after testing").
      contextMessage = buildBackgroundBlock(
        { sessions: sessions ?? [], entries: entries ?? [] },
        TEACHER_BACKGROUND_INTRO,
        isFollowUpTurn(messages)
      )
    }

    // Which backend answers the teacher chat: "anthropic" (direct Anthropic API,
    // the default) or "ballabot" (the mini's local dharma-llm service, backed by
    // Balla Bot's Claude Code subscription — no per-message API cost). Move 13.
    const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase()

    // The teacher now consults the Buddhist library itself (via read-only tools on
    // the dharma-llm side), so we no longer pre-search and inject passages here.
    const fullSystem = assembleSystemPrompt(TEACHER_SYSTEM_PROMPT, contextMessage)
    const chatMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    const MAX_TOKENS = 1024
    const encoder = new TextEncoder()

    const readableStream = provider === 'ballabot'
      ? new ReadableStream({
          // Route the teacher chat through Balla Bot's local dharma-llm service
          // (loopback on the mini). It streams plain text back, which we pass
          // straight through to the browser.
          async start(controller) {
            try {
              // Look up the practitioner's chosen teacher depth. A failure here
              // should never break the chat — just fall back to the service's
              // own default model.
              let teacherModel: string | undefined
              try {
                const db = await createClient()
                const { data: s } = await db
                  .from('user_settings')
                  .select('teacher_model')
                  .eq('user_id', user.id)
                  .single()

                if (s?.teacher_model && TEACHER_MODEL_ALLOWLIST.includes(s.teacher_model)) {
                  teacherModel = s.teacher_model
                }
              } catch (settingsError) {
                console.error('Chat API teacher_model lookup failed:', settingsError instanceof Error ? settingsError.message : 'Unknown error')
              }

              const res = await fetch(`${process.env.DHARMA_LLM_URL}/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.DHARMA_LLM_TOKEN ?? ''}`,
                },
                body: JSON.stringify({
                  system: fullSystem,
                  messages: chatMessages,
                  max_tokens: MAX_TOKENS,
                  // Opt in to keepalive/library-status markers on the stream so the
                  // UI can keep the connection alive and show "consulting the
                  // library…" during a lookup. The browser strips these out.
                  stream_markers: true,
                  ...(teacherModel ? { model: teacherModel } : {}),
                }),
              })

              if (!res.ok || !res.body) {
                const detail = await res.text().catch(() => '')
                throw new Error(`dharma-llm responded ${res.status} ${detail.slice(0, 200)}`)
              }

              const reader = res.body.getReader()
              for (;;) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) controller.enqueue(value)
              }
              controller.close()
            } catch (error) {
              console.error('Chat API stream error (ballabot):', error instanceof Error ? error.message : 'Unknown error')
              controller.error(error)
            }
          },
        })
      : new ReadableStream({
          async start(controller) {
            try {
              const stream = client.messages.stream({
                model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
                max_tokens: MAX_TOKENS,
                system: fullSystem,
                messages: chatMessages,
              })

              for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  controller.enqueue(encoder.encode(event.delta.text))
                }
              }
              controller.close()
            } catch (error) {
              console.error('Chat API stream error:', error instanceof Error ? error.message : 'Unknown error')
              controller.error(error)
            }
          },
        })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: unknown) {
    console.error('Chat API error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'The teacher is unavailable right now. Please try again in a moment.' },
      { status: 500 }
    )
  }
}
