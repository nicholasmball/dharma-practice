'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [includeContext, setIncludeContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          includeContext: includeContext && messages.length === 0, // Only on first message
        }),
      })

      const data = await response.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `I apologize, but I encountered an error: ${data.error}. Please try again.` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, but I had trouble connecting. Please check your internet connection and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleNewConversation = () => {
    setMessages([])
  }

  const suggestedQuestions = [
    "I'm struggling with a busy mind during meditation. Any advice?",
    "Can you explain the difference between shamatha and vipashyana?",
    "What is rigpa in Dzogchen practice?",
    "How do I integrate practice into daily life?",
    "I had an interesting experience in meditation today...",
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '4px' }}>Meditation Teacher</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Ask questions about your practice
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewConversation}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            New Conversation
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '20px',
        marginBottom: '16px',
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>◈</span>
            </div>
            <p style={{ color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              I'm here to support your meditation practice. Ask me about shamatha, vipashyana,
              Mahamudra, Dzogchen, or any challenges you're experiencing.
            </p>

            {/* Context Toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '0.875rem',
            }}>
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Include my practice history for personalized guidance
            </label>

            {/* Suggested Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '14px 18px',
                  borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: message.role === 'user' ? 'var(--accent)' : 'var(--background)',
                  color: message.role === 'user' ? 'var(--background)' : 'var(--foreground)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: 'var(--background)',
                  color: 'var(--muted)',
                }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>Reflecting...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your practice..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            outline: 'none',
            fontSize: '1rem',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '16px 28px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'var(--background)',
            fontWeight: 600,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
