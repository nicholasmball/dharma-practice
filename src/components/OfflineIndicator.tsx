'use client'

import { useState, useEffect } from 'react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '10px 20px',
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--accent)',
      borderRadius: '20px',
      color: 'var(--accent)',
      fontSize: '0.875rem',
      fontWeight: 500,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    }}>
      <span style={{ fontSize: '1rem' }}>○</span>
      You're offline
    </div>
  )
}
