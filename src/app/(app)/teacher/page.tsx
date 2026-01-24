'use client'

import { useState, useRef, useEffect } from 'react'
import {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  Conversation,
  Message,
} from './actions'

export default function TeacherPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [includeContext, setIncludeContext] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoadingConversations(true)
    const convs = await getConversations()
    setConversations(convs)
    setLoadingConversations(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSelectConversation = async (id: string) => {
    const conv = await getConversation(id)
    if (conv) {
      setActiveConversationId(id)
      setMessages(conv.messages)
    }
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return

    await deleteConversation(id)
    setConversations(conversations.filter(c => c.id !== id))

    if (activeConversationId === id) {
      setActiveConversationId(null)
      setMessages([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          includeContext: includeContext && messages.length === 0,
        }),
      })

      const data = await response.json()

      if (data.error) {
        const errorMessages: Message[] = [...newMessages, { role: 'assistant', content: `I apologize, but I encountered an error: ${data.error}. Please try again.` }]
        setMessages(errorMessages)
      } else {
        const updatedMessages: Message[] = [...newMessages, { role: 'assistant', content: data.message }]
        setMessages(updatedMessages)

        // Save conversation
        if (activeConversationId) {
          // Update existing conversation
          await updateConversation(activeConversationId, updatedMessages)
        } else {
          // Create new conversation with title from first user message
          const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage
          const newId = await createConversation(title, updatedMessages)
          if (newId) {
            setActiveConversationId(newId)
          }
        }

        // Refresh conversation list
        loadConversations()
      }
    } catch (error) {
      const errorMessages: Message[] = [...newMessages, { role: 'assistant', content: 'I apologize, but I had trouble connecting. Please check your internet connection and try again.' }]
      setMessages(errorMessages)
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    "I'm struggling with a busy mind during meditation. Any advice?",
    "Can you explain the difference between shamatha and vipashyana?",
    "What is rigpa in Dzogchen practice?",
    "How do I integrate practice into daily life?",
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '16px' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '280px' : '0px',
        flexShrink: 0,
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: sidebarOpen ? '1px solid var(--border)' : 'none',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {sidebarOpen && (
          <>
            {/* New Conversation Button */}
            <div style={{ padding: '16px' }}>
              <button
                onClick={handleNewConversation}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--background)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>+</span> New Conversation
              </button>
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
              {loadingConversations ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px' }}>
                  Loading...
                </p>
              ) : conversations.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px' }}>
                  No conversations yet
                </p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      backgroundColor: activeConversationId === conv.id ? 'var(--background)' : 'transparent',
                      border: activeConversationId === conv.id ? '1px solid var(--border)' : '1px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {conv.title}
                      </p>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          fontSize: '0.875rem',
                          borderRadius: '4px',
                        }}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                      {formatDate(conv.updated_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute',
          left: sidebarOpen ? '348px' : '88px',
          top: '140px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          color: 'var(--muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          zIndex: 10,
          transition: 'left 0.2s ease',
        }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '4px' }}>Meditation Teacher</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            {activeConversationId ? 'Continuing conversation' : 'Start a new conversation'}
          </p>
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
                    Reflecting...
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
    </div>
  )
}
