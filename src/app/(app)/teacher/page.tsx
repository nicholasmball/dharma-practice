'use client'

import { useState, useRef, useEffect } from 'react'
import {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  getPracticeProfile,
  Conversation,
  Message,
  PracticeProfile,
} from './actions'

// Question pools based on practitioner profile
const QUESTION_POOLS = {
  newPractitioner: [
    "What's the best way to establish a daily meditation habit?",
    "I'm new to meditation. Where should I begin?",
    "How long should I meditate as a beginner?",
    "What should I do when my mind wanders during meditation?",
    "Can you explain the basics of shamatha practice?",
    "What posture is best for meditation?",
  ],
  shamatha: [
    "How do I deepen my calm abiding practice?",
    "I can rest in stillness but my mind is still subtly active. What next?",
    "What are the signs of progress in shamatha?",
    "How do I work with subtle dullness in meditation?",
    "When is the right time to transition from shamatha to vipashyana?",
    "How do I cultivate stable attention without tension?",
  ],
  vipashyana: [
    "How do I investigate the nature of mind in vipashyana?",
    "What's the relationship between shamatha and vipashyana?",
    "Can you explain the four foundations of mindfulness?",
    "How do I practice analytical meditation effectively?",
    "What does it mean to see the empty nature of thoughts?",
    "How do I balance stability with inquiry in practice?",
  ],
  dzogchen: [
    "Can you explain the view of Dzogchen in simple terms?",
    "What is rigpa and how do I recognize it?",
    "How do I sustain recognition of awareness throughout the day?",
    "What's the relationship between trekchö and tögal?",
    "How do I work with thoughts without following or suppressing them?",
    "What role does devotion play in Dzogchen practice?",
  ],
  mahamudra: [
    "What distinguishes Mahamudra from other meditation approaches?",
    "How do I rest in the natural state of mind?",
    "Can you explain the four yogas of Mahamudra?",
    "What does it mean to recognize mind's true nature?",
    "How do I integrate Mahamudra into daily activities?",
    "What is the role of pointing-out instructions?",
  ],
  returningAfterBreak: [
    "I've been away from practice for a while. How do I restart?",
    "How do I rebuild momentum after losing my practice routine?",
    "I feel guilty about not practicing. How do I work with that?",
    "What's the best way to re-establish a meditation habit?",
    "How do I reconnect with my practice after time away?",
    "Should I start from the beginning or pick up where I left off?",
  ],
  activeStreak: [
    "I've been practicing consistently. What's the next step in my development?",
    "How do I deepen my practice beyond just maintaining it?",
    "What signs indicate I'm ready for more advanced practices?",
    "How do I prevent my practice from becoming stale or mechanical?",
    "What should I focus on to make the most of my momentum?",
    "How do I integrate practice realization into daily life?",
  ],
}

function selectPersonalizedQuestions(profile: PracticeProfile): string[] {
  let pool: string[]

  // Determine which pool to use based on profile
  if (profile.sessionCount < 5) {
    pool = QUESTION_POOLS.newPractitioner
  } else if (profile.daysSinceLastSession !== null && profile.daysSinceLastSession > 7) {
    pool = QUESTION_POOLS.returningAfterBreak
  } else if (profile.currentStreak >= 7) {
    pool = QUESTION_POOLS.activeStreak
  } else {
    // Use practice-type specific questions
    switch (profile.dominantPracticeType) {
      case 'dzogchen':
        pool = QUESTION_POOLS.dzogchen
        break
      case 'mahamudra':
        pool = QUESTION_POOLS.mahamudra
        break
      case 'vipashyana':
        pool = QUESTION_POOLS.vipashyana
        break
      case 'shamatha':
      default:
        pool = QUESTION_POOLS.shamatha
        break
    }
  }

  // Shuffle and pick 4 questions
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
}

export default function TeacherPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [includeContext, setIncludeContext] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      // On desktop, default sidebar to open
      if (window.innerWidth >= 768) {
        setSidebarOpen(true)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load conversations and practice profile on mount
  useEffect(() => {
    loadConversations()
    loadPracticeProfile()
  }, [])

  const loadPracticeProfile = async () => {
    const profile = await getPracticeProfile()
    const questions = selectPersonalizedQuestions(profile)
    setSuggestedQuestions(questions)
  }

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
      // Close sidebar on mobile after selecting
      if (isMobile) {
        setSidebarOpen(false)
      }
    }
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    // Close sidebar on mobile after action
    if (isMobile) {
      setSidebarOpen(false)
    }
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

  // Default questions shown while profile loads
  const defaultQuestions = [
    "I'm struggling with a busy mind during meditation. Any advice?",
    "Can you explain the difference between shamatha and vipashyana?",
    "What is rigpa in Dzogchen practice?",
    "How do I integrate practice into daily life?",
  ]

  const displayQuestions = suggestedQuestions.length > 0 ? suggestedQuestions : defaultQuestions

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    // Search in title
    if (conv.title.toLowerCase().includes(query)) return true
    // Search in message content
    return conv.messages.some(msg => msg.content.toLowerCase().includes(query))
  })

  return (
    <div style={{ display: 'flex', height: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 100px)', gap: isMobile ? '0' : '16px', position: 'relative' }}>
      {/* Mobile Overlay Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
        } : {
          width: sidebarOpen ? '280px' : '0px',
          flexShrink: 0,
          transition: 'width 0.2s ease',
        }),
        backgroundColor: 'var(--surface)',
        borderRadius: isMobile ? '0' : '16px',
        borderTop: (sidebarOpen || isMobile) ? '1px solid var(--border)' : 'none',
        borderRight: (sidebarOpen || isMobile) ? '1px solid var(--border)' : 'none',
        borderBottom: (sidebarOpen || isMobile) ? '1px solid var(--border)' : 'none',
        borderLeft: isMobile ? 'none' : ((sidebarOpen || isMobile) ? '1px solid var(--border)' : 'none'),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {(sidebarOpen || isMobile) && (
          <>
            {/* Close button for mobile */}
            {isMobile && (
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* New Conversation Button */}
            <div style={{ padding: isMobile ? '0 16px 8px' : '16px 16px 8px' }}>
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

            {/* Search Input */}
            <div style={{ padding: '0 16px 12px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
              {loadingConversations ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px' }}>
                  Loading...
                </p>
              ) : filteredConversations.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '16px' }}>
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </p>
              ) : (
                filteredConversations.map(conv => (
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

      {/* Toggle Sidebar Button - Desktop only */}
      {!isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            left: sidebarOpen ? '284px' : '4px',
            top: '70px',
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
      )}

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              ☰
            </button>
          )}
          <div>
            <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 300, marginBottom: '4px' }}>Meditation Teacher</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              {activeConversationId ? 'Continuing conversation' : 'Start a new conversation'}
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: isMobile ? '12px' : '20px',
          marginBottom: '16px',
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: isMobile ? '20px 10px' : '40px 20px' }}>
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
              <p style={{ color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6, fontSize: isMobile ? '0.875rem' : '1rem' }}>
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
                fontSize: isMobile ? '0.75rem' : '0.875rem',
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
                {displayQuestions.map((question, index) => (
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
                      fontSize: isMobile ? '0.8rem' : '0.875rem',
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
                    maxWidth: isMobile ? '90%' : '85%',
                    padding: isMobile ? '10px 14px' : '14px 18px',
                    borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: message.role === 'user' ? 'var(--accent)' : 'var(--background)',
                    color: message.role === 'user' ? 'var(--background)' : 'var(--foreground)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    fontSize: isMobile ? '0.875rem' : '1rem',
                  }}>
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: isMobile ? '10px 14px' : '14px 18px',
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isMobile ? "Ask a question..." : "Ask a question about your practice..."}
            disabled={loading}
            style={{
              flex: 1,
              padding: isMobile ? '12px 14px' : '16px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              outline: 'none',
              fontSize: isMobile ? '0.875rem' : '1rem',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: isMobile ? '12px 16px' : '16px 28px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'var(--background)',
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              fontSize: isMobile ? '0.875rem' : '1rem',
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
