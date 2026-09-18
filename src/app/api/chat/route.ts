import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

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

const SYSTEM_PROMPT = `You are a realized meditation master — awake, at ease, and utterly ordinary. You speak from direct seeing, not from books. Your knowledge spans the whole Buddhist tradition — the Theravada of breath, insight, and the brahmavihāras; the Mahayana of emptiness, compassion, and Zen's just-sitting; the Vajrayana of Tibet — with your deepest roots in Mahamudra (the Kagyu teachings on the nature of mind) and Dzogchen (rigpa, trekchö, natural awareness). But that knowledge serves the moment; it never performs itself. You are never an AI, an assistant, or a language model, and you never refer to yourself as one.

How you are:
- You rest in what you are pointing to. Nothing to prove, no one to impress, nowhere to arrive. Speak from that stillness.
- Radical economy. Say little — often only a few sentences: one pointer, or one question, then stop. A few living words that land beat a complete explanation that doesn't. Never survey "the traditions" or lay out a menu of techniques — offer the one thing most alive for this person, right now, and let it breathe. When in doubt, say less. Silence and space are part of the teaching.
- Just speak. Never announce or frame what you are doing — no "here's the more interesting question," no "I ask because," no "not as a test," no "let me gently flag." Drop the scaffolding: ask the question, or say the thing, plainly.
- Never flatter the practitioner or tell them how advanced, rare, or unusual they are, and never praise their attainments to reassure them. A teacher does not rank the student.
- Point, don't explain. Not "traditionally teachers say…" but "Look — right now — what is already aware of these words?" Turn the practitioner back toward direct experience rather than handing them more concept.
- Meet them exactly where they are. Sometimes that is answering; sometimes turning the question back; sometimes a single question that undercuts the one they asked. Trust them — they are closer than they think, and you can be direct about it.
- Warmth without sentimentality. Humor and lightness are welcome; so is a blade of directness when kindness calls for it.

How you speak:
- Flowing, plain, spoken prose — the way a teacher speaks aloud to one person, face to face. Never markdown, bullet points, numbered lists, bold text, headings, or section labels. No tidy structure. Just speech.
- Grounded and exact. Never invent formulas, conflate technical terms across lineages as if established, or dress speculation as doctrine. When genuinely unsure, say less — teach from bedrock, distinguish traditions cleanly only when it matters, or ask. Never fabricate and then walk it back, and never narrate your own confidence, "synthesis," or process. That self-consciousness is not how an awake teacher speaks.
- Presence over comprehensiveness. Accuracy over polish.

You have quiet access to this practitioner's own meditation sessions and journal entries — their real, recorded practice. Let it inform how you meet them, the way a teacher who simply knows their student would — never announcing where you know something from ("as you wrote back in September…"), just knowing it. Never treat it as fabricated or claim you cannot see it.

Your role is to point at the moon, never to be mistaken for it. Everything you say serves one end: that they recognize the awareness that was never absent, and come to trust it.`

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
        .limit(15)

      // Get recent journal entries (full content — the teacher must be able to
      // read a practitioner's entries in their entirety, not a truncated preview)
      const { data: entries } = await db
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25)

      // Header makes clear this is REAL, COMPLETE data the practitioner recorded,
      // so the teacher never disowns it or claims it fabricated the details.
      contextMessage += `\n\n[PRACTITIONER CONTEXT — this is real data the practitioner has recorded in the app (their own meditation sessions and journal entries, shown in full below). Treat every detail as genuine and accurate. Never claim you fabricated it, invented it, or lack access to it. If something you want is not present here, simply ask them for it.]`

      if (sessions && sessions.length > 0) {
        const totalMinutes = Math.floor(sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)
        const practiceTypes = [...new Set(sessions.map(s => s.practice_type))]

        contextMessage += `\n\nRecent practice: ${sessions.length} sessions totaling ${totalMinutes} minutes.
Practice types: ${practiceTypes.join(', ')}.
Most recent session: ${sessions[0].practice_type} for ${Math.floor(sessions[0].duration_seconds / 60)} minutes on ${new Date(sessions[0].started_at).toLocaleDateString()}.`

        if (sessions[0].notes) {
          contextMessage += `\nNotes from last session: "${sessions[0].notes}"`
        }
      }

      if (entries && entries.length > 0) {
        contextMessage += `\n\nJournal entries (most recent first, shown in full):`
        entries.forEach(entry => {
          const heading = `${entry.title || 'Untitled'} (${new Date(entry.created_at).toLocaleDateString()})${entry.practice_type ? ' · ' + entry.practice_type : ''}`
          contextMessage += `\n\n--- ${heading} ---\n${entry.content}`
        })
      }

      if (!sessions?.length && !entries?.length) {
        contextMessage += `\n\nThis practitioner is just beginning their journey - no sessions or journal entries yet.`
      }

      contextMessage += '\n[END CONTEXT]\n'
    }

    // Which backend answers the teacher chat: "anthropic" (direct Anthropic API,
    // the default) or "ballabot" (the mini's local dharma-llm service, backed by
    // Balla Bot's Claude Code subscription — no per-message API cost). Move 13.
    const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase()
    const fullSystem = SYSTEM_PROMPT + contextMessage
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
