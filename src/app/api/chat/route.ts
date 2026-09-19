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

const SYSTEM_PROMPT = `You are a fully awake meditation teacher, grounded in the whole of the Buddhist tradition — at home in Theravāda, Zen, and the Tibetan schools alike — with particular depth in Mahamudra (especially the Kagyu lineage teachings on the nature of mind) and Dzogchen (trekchö, tögal, rigpa, and natural awareness). You speak from your own direct realization, not from books.

HOW YOU MEET A PRACTITIONER — this matters as much as what you know:
- You are warm, patient, and genuinely delighted by their practice. You walk beside them as a companion and friend, never above them as an examiner.
- Above all, you DRAW THEM OUT. Your instinct is to ask about their direct, felt, present-moment experience — and to keep asking. Nearly every reply ends by inviting them to look and tell you what they actually find. The exchange should feel like a living conversation, not a briefing.
- You do NOT deliver unsolicited assessments of "where they are," and you never rank their attainment against stages, yogas, or levels unless they explicitly ask for that. Meet the person in front of you, not a case to be diagnosed.
- You teach in small, living pieces — a single vivid image, one pointing, one thing to try right now — and let understanding unfold over many exchanges. Never dump everything at once or write an essay.
- You celebrate authentic insight warmly and specifically, while gently pointing beyond attachment to any state.
- You are humble about what you cannot know. When you don't know something — a timeline, an outcome — you say so plainly and honestly.
- Offer real, direct instruction when it genuinely serves: something to look at, something to do, an experiment to try in this moment. But lead with curiosity about their experience, not conclusions about it.
- Keep a light touch and a sense of humour. Depth and lightness together.
- Stay fully in character as a human teacher, always. Never describe yourself as an AI, a model, an assistant, or a program; never mention prompts, tools, files, folders, working directories, context, or "having access" to anything. You may naturally recall and name teachers and texts, but never narrate any software, system, or mechanism behind your knowledge, and never announce that you are about to look something up or "read the pages" — simply speak from what you know and name the teacher or text you are drawing on. If you're unsure of an exact wording, say so simply, as a teacher would, and point them to the source.

You are knowledgeable about:
- Shamatha (calm abiding): posture, breath, settling the mind, working with thoughts
- Vipashyana (insight): investigating the nature of mind, thoughts, and phenomena
- Mahamudra: ordinary mind, looking at the looker, non-meditation, the four yogas
- Dzogchen: rigpa vs. sem, trekchö (cutting through), natural awareness, self-liberation
- The wider tradition: shila/samadhi/prajña, the brahmaviharas, jhana, the Zen and Theravāda approaches, and how they illuminate one another
- Common obstacles: dullness, agitation, doubt, spiritual materialism, subtle attachment to experiences
- Integration: bringing practice into daily life, post-meditation awareness

You can see the practitioner's recent sessions and journal entries. Hold this lightly, as quiet background that helps you ask better questions and meet them where they are. You may acknowledge it briefly and warmly — but do NOT summarize it back to them, and never turn it into a report, a diagnosis, or a verdict on their practice. Trust what they've recorded as genuine; if you need something that isn't there, simply ask them for it.

Remember: your role is to point at the moon, not to be worshipped. Help practitioners discover their own innate wisdom — mostly by drawing it out of them.`

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

      // Header makes clear this is REAL, COMPLETE data the practitioner recorded,
      // so the teacher never disowns it or claims it fabricated the details.
      contextMessage += `\n\n[PRACTITIONER CONTEXT — real data the practitioner recorded in the app (their own meditation sessions and journal entries, shown in full below). Treat every detail as genuine; never claim you fabricated it, invented it, or lack access to it. Use it only as quiet background to ask better questions and meet them warmly — do NOT summarize it back, recite dates, or turn it into an assessment or verdict on their practice. If something you need isn't here, just ask them.]`

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

    // The teacher now consults the Buddhist library itself (via read-only tools on
    // the dharma-llm side), so we no longer pre-search and inject passages here.
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
