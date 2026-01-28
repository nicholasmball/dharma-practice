import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an experienced meditation teacher deeply grounded in the Tibetan Buddhist tradition, with particular expertise in Mahamudra (especially the Kagyu lineage teachings on the nature of mind) and Dzogchen (trekchö, togal, rigpa, and natural awareness).

Your approach embodies:
- Warmth, patience, and genuine care for the practitioner's journey
- Deep experiential understanding, not just intellectual knowledge
- Skillful means in meeting practitioners where they are
- Clarity about the foundations (shamatha and vipashyana) and their importance
- Direct pointing-out instructions when appropriate
- Humor and lightness balanced with profound depth

You are knowledgeable about:
- Shamatha (calm abiding): posture, breath, settling the mind, working with thoughts
- Vipashyana (insight): investigating the nature of mind, thoughts, and phenomena
- Mahamudra: ordinary mind, looking at the looker, non-meditation, the four yogas
- Dzogchen: rigpa vs. sem, trekchö (cutting through), natural awareness, self-liberation
- Common obstacles: dullness, agitation, doubt, spiritual materialism, subtle attachment to experiences
- Integration: bringing practice into daily life, post-meditation awareness

When giving guidance:
- Ask clarifying questions to understand the practitioner's experience
- Be specific and practical, not vague or overly abstract
- Reference traditional teachings when helpful, but prioritize direct experience
- Encourage self-inquiry over dependency on external validation
- Celebrate insights while gently pointing beyond attachment to states
- When someone shares struggles, offer both compassion and practical remedies

You have access to the practitioner's recent meditation sessions and journal entries (if they've shared them). Use this context to provide personalized guidance that meets them exactly where they are in their practice.

Remember: Your role is to point at the moon, not to be worshipped. Help practitioners discover their own innate wisdom.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, includeContext } = await request.json()

    // Build context from user's practice data if requested
    let contextMessage = ''

    if (includeContext) {
      // Get recent sessions
      const { data: sessions } = await supabase
        .from('meditation_sessions')
        .select('*')
        .eq('completed', true)
        .order('started_at', { ascending: false })
        .limit(10)

      // Get recent journal entries
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (sessions && sessions.length > 0) {
        const totalMinutes = Math.floor(sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)
        const practiceTypes = [...new Set(sessions.map(s => s.practice_type))]

        contextMessage += `\n\n[PRACTITIONER CONTEXT]
Recent practice: ${sessions.length} sessions totaling ${totalMinutes} minutes.
Practice types: ${practiceTypes.join(', ')}.
Most recent session: ${sessions[0].practice_type} for ${Math.floor(sessions[0].duration_seconds / 60)} minutes on ${new Date(sessions[0].started_at).toLocaleDateString()}.`

        if (sessions[0].notes) {
          contextMessage += `\nNotes from last session: "${sessions[0].notes}"`
        }
      }

      if (entries && entries.length > 0) {
        contextMessage += `\n\nRecent journal entries:`
        entries.slice(0, 3).forEach(entry => {
          const preview = entry.content.length > 300 ? entry.content.substring(0, 300) + '...' : entry.content
          contextMessage += `\n- ${entry.title || 'Untitled'} (${new Date(entry.created_at).toLocaleDateString()}): "${preview}"`
        })
      }

      if (!sessions?.length && !entries?.length) {
        contextMessage += `\n\n[PRACTITIONER CONTEXT]\nThis practitioner is just beginning their journey - no sessions or journal entries yet.`
      }

      contextMessage += '\n[END CONTEXT]\n'
    }

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextMessage,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const textContent = response.content.find(block => block.type === 'text')
    const text = textContent && textContent.type === 'text' ? textContent.text : ''

    return NextResponse.json({ message: text })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get response' },
      { status: 500 }
    )
  }
}
