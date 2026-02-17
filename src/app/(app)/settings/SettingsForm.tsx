'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateSettings, exportUserData, deleteAccount, saveCustomPracticeTypes } from './actions'
import { logout } from '@/app/(auth)/actions'
import { BuiltInPracticeType, CustomPracticeType, practiceTypeLabels, BUILT_IN_PRACTICE_TYPES } from '@/lib/types'
import { useTheme } from '@/components/ThemeProvider'

const DURATION_OPTIONS = [
  { value: 600, label: '10 minutes' },
  { value: 1200, label: '20 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 2700, label: '45 minutes' },
  { value: 3600, label: '60 minutes' },
]

const BELL_SOUNDS: Record<string, { name: string; description: string }> = {
  singing_bowl: { name: 'Singing Bowl', description: 'Warm tone with gentle overtones' },
  temple_bell: { name: 'Temple Bell', description: 'Bright and clear with shimmer' },
  tingsha: { name: 'Tingsha', description: 'Bright Tibetan cymbals, quick ring' },
  deep_gong: { name: 'Deep Gong', description: 'Low resonant tone, long decay' },
}

// Bell preview functions using Web Audio API
function previewBellSound(key: string) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const now = ctx.currentTime

  if (key === 'singing_bowl') {
    const osc1 = ctx.createOscillator(); const g1 = ctx.createGain()
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(220, now)
    g1.gain.setValueAtTime(0.3, now); g1.gain.exponentialRampToValueAtTime(0.01, now + 4)
    osc1.connect(g1); g1.connect(ctx.destination)
    const osc2 = ctx.createOscillator(); const g2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(440, now)
    g2.gain.setValueAtTime(0.15, now); g2.gain.exponentialRampToValueAtTime(0.01, now + 3)
    osc2.connect(g2); g2.connect(ctx.destination)
    const osc3 = ctx.createOscillator(); const g3 = ctx.createGain()
    osc3.type = 'sine'; osc3.frequency.setValueAtTime(660, now)
    g3.gain.setValueAtTime(0.08, now); g3.gain.exponentialRampToValueAtTime(0.01, now + 2)
    osc3.connect(g3); g3.connect(ctx.destination)
    osc1.start(now); osc2.start(now); osc3.start(now)
    osc1.stop(now + 4); osc2.stop(now + 3); osc3.stop(now + 2)
  } else if (key === 'temple_bell') {
    const osc1 = ctx.createOscillator(); const g1 = ctx.createGain()
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(523, now)
    g1.gain.setValueAtTime(0.25, now); g1.gain.exponentialRampToValueAtTime(0.01, now + 3)
    osc1.connect(g1); g1.connect(ctx.destination)
    const osc2 = ctx.createOscillator(); const g2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(1047, now)
    g2.gain.setValueAtTime(0.12, now); g2.gain.exponentialRampToValueAtTime(0.01, now + 2)
    osc2.connect(g2); g2.connect(ctx.destination)
    const osc3 = ctx.createOscillator(); const g3 = ctx.createGain()
    osc3.type = 'sine'; osc3.frequency.setValueAtTime(1568, now)
    g3.gain.setValueAtTime(0.06, now); g3.gain.exponentialRampToValueAtTime(0.01, now + 1.5)
    osc3.connect(g3); g3.connect(ctx.destination)
    const osc4 = ctx.createOscillator(); const g4 = ctx.createGain()
    osc4.type = 'sine'; osc4.frequency.setValueAtTime(2093, now)
    g4.gain.setValueAtTime(0.04, now); g4.gain.exponentialRampToValueAtTime(0.01, now + 1)
    osc4.connect(g4); g4.connect(ctx.destination)
    osc1.start(now); osc2.start(now); osc3.start(now); osc4.start(now)
    osc1.stop(now + 3); osc2.stop(now + 2); osc3.stop(now + 1.5); osc4.stop(now + 1)
  } else if (key === 'tingsha') {
    const osc1 = ctx.createOscillator(); const g1 = ctx.createGain()
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(1200, now)
    g1.gain.setValueAtTime(0.2, now); g1.gain.exponentialRampToValueAtTime(0.01, now + 2)
    osc1.connect(g1); g1.connect(ctx.destination)
    const osc2 = ctx.createOscillator(); const g2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(2400, now)
    g2.gain.setValueAtTime(0.1, now); g2.gain.exponentialRampToValueAtTime(0.01, now + 1.5)
    osc2.connect(g2); g2.connect(ctx.destination)
    const osc3 = ctx.createOscillator(); const g3 = ctx.createGain()
    osc3.type = 'sine'; osc3.frequency.setValueAtTime(1210, now)
    g3.gain.setValueAtTime(0.08, now); g3.gain.exponentialRampToValueAtTime(0.01, now + 1.8)
    osc3.connect(g3); g3.connect(ctx.destination)
    osc1.start(now); osc2.start(now); osc3.start(now)
    osc1.stop(now + 2); osc2.stop(now + 1.5); osc3.stop(now + 1.8)
  } else if (key === 'deep_gong') {
    const osc1 = ctx.createOscillator(); const g1 = ctx.createGain()
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(80, now)
    g1.gain.setValueAtTime(0.35, now); g1.gain.exponentialRampToValueAtTime(0.01, now + 6)
    osc1.connect(g1); g1.connect(ctx.destination)
    const osc2 = ctx.createOscillator(); const g2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(160, now)
    g2.gain.setValueAtTime(0.2, now); g2.gain.exponentialRampToValueAtTime(0.01, now + 5)
    osc2.connect(g2); g2.connect(ctx.destination)
    const osc3 = ctx.createOscillator(); const g3 = ctx.createGain()
    osc3.type = 'sine'; osc3.frequency.setValueAtTime(240, now)
    g3.gain.setValueAtTime(0.1, now); g3.gain.exponentialRampToValueAtTime(0.01, now + 4)
    osc3.connect(g3); g3.connect(ctx.destination)
    osc1.start(now); osc2.start(now); osc3.start(now)
    osc1.stop(now + 6); osc2.stop(now + 5); osc3.stop(now + 4)
  }
}

interface SettingsFormProps {
  initialSettings: {
    meditation_reminder_enabled: boolean
    meditation_reminder_time: string | null
    journal_reminder_enabled: boolean
    journal_reminder_time: string | null
    default_session_duration: number
    default_practice_type: string
    custom_practice_types?: CustomPracticeType[]
    bell_sound?: string
  } | null
  userEmail: string
}

export default function SettingsForm({ initialSettings, userEmail }: SettingsFormProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Form state
  const [meditationReminderEnabled, setMeditationReminderEnabled] = useState(initialSettings?.meditation_reminder_enabled || false)
  const [meditationReminderTime, setMeditationReminderTime] = useState(initialSettings?.meditation_reminder_time || '07:00')
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(initialSettings?.journal_reminder_enabled || false)
  const [journalReminderTime, setJournalReminderTime] = useState(initialSettings?.journal_reminder_time || '21:00')
  const [defaultDuration, setDefaultDuration] = useState(initialSettings?.default_session_duration || 1200)
  const [defaultPracticeType, setDefaultPracticeType] = useState(initialSettings?.default_practice_type || 'shamatha')
  const [bellSound, setBellSound] = useState(initialSettings?.bell_sound || 'singing_bowl')

  // Custom practice types state
  const [customTypes, setCustomTypes] = useState<CustomPracticeType[]>(initialSettings?.custom_practice_types || [])
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDescription, setNewTypeDescription] = useState('')
  const [savingCustomTypes, setSavingCustomTypes] = useState(false)

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState('feedback')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        new Notification('balladharma', {
          body: 'Notifications are now enabled!',
          icon: '/favicon.ico',
        })
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const result = await updateSettings({
      meditation_reminder_enabled: meditationReminderEnabled,
      meditation_reminder_time: meditationReminderEnabled ? meditationReminderTime : null,
      journal_reminder_enabled: journalReminderEnabled,
      journal_reminder_time: journalReminderEnabled ? journalReminderTime : null,
      default_session_duration: defaultDuration,
      default_practice_type: defaultPracticeType,
      bell_sound: bellSound,
    })

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    }

    setSaving(false)
  }

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)

    const result = await exportUserData()

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result.data) {
      // Download as JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dharma-practice-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Data exported successfully!' })
    }

    setExporting(false)
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return

    setDeleting(true)
    setMessage(null)

    const result = await deleteAccount()

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setDeleting(false)
    } else {
      // Redirect to home page after deletion
      router.push('/')
    }
  }

  const handleAddCustomType = async () => {
    const trimmedName = newTypeName.trim()
    if (!trimmedName) return

    // Check for duplicates (case-insensitive)
    const existsInBuiltIn = BUILT_IN_PRACTICE_TYPES.some(
      t => t.toLowerCase() === trimmedName.toLowerCase()
    )
    const existsInCustom = customTypes.some(
      ct => ct.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (existsInBuiltIn || existsInCustom) {
      setMessage({ type: 'error', text: 'A practice type with this name already exists.' })
      return
    }

    const newType: CustomPracticeType = {
      name: trimmedName,
      description: newTypeDescription.trim() || undefined,
    }

    const updatedTypes = [...customTypes, newType]
    setSavingCustomTypes(true)
    setMessage(null)

    const result = await saveCustomPracticeTypes(updatedTypes)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setCustomTypes(updatedTypes)
      setNewTypeName('')
      setNewTypeDescription('')
      setMessage({ type: 'success', text: 'Custom practice type added!' })
    }

    setSavingCustomTypes(false)
  }

  const handleDeleteCustomType = async (nameToDelete: string) => {
    const updatedTypes = customTypes.filter(ct => ct.name !== nameToDelete)
    setSavingCustomTypes(true)
    setMessage(null)

    const result = await saveCustomPracticeTypes(updatedTypes)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setCustomTypes(updatedTypes)
      // If the deleted type was the default, reset to shamatha
      if (defaultPracticeType.toLowerCase() === nameToDelete.toLowerCase()) {
        setDefaultPracticeType('shamatha')
      }
      setMessage({ type: 'success', text: 'Custom practice type removed.' })
    }

    setSavingCustomTypes(false)
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return

    setSendingFeedback(true)
    setFeedbackStatus(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: feedbackType, message: feedbackMessage }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFeedbackStatus({ type: 'error', text: data.error || 'Something went wrong.' })
      } else {
        setFeedbackStatus({ type: 'success', text: 'Thank you! Your feedback has been sent.' })
        setFeedbackMessage('')
        setFeedbackType('feedback')
      }
    } catch {
      setFeedbackStatus({ type: 'error', text: 'Failed to send. Please try again later.' })
    }

    setSendingFeedback(false)
  }

  // Helper to get label for any practice type
  const getPracticeLabel = (type: string): string => {
    if (type in practiceTypeLabels) {
      return practiceTypeLabels[type as BuiltInPracticeType]
    }
    const customType = customTypes.find(ct => ct.name.toLowerCase() === type.toLowerCase())
    if (customType) {
      return customType.name
    }
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Message */}
      {message && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: message.type === 'success' ? 'rgba(85, 176, 133, 0.1)' : 'rgba(224, 85, 85, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(85, 176, 133, 0.3)' : 'rgba(224, 85, 85, 0.3)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
        }}>
          {message.text}
        </div>
      )}

      {/* Account Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '16px' }}>Account</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>
          Signed in as <span style={{ color: 'var(--foreground)' }}>{userEmail}</span>
        </p>
        <form action={logout}>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid var(--error)',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Sign Out
          </button>
        </form>
      </section>

      {/* Appearance Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '16px' }}>Appearance</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ marginBottom: '4px' }}>Theme</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Choose between light and dark mode
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: theme === 'light' ? '2px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: theme === 'light' ? 'var(--background)' : 'transparent',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '1rem' }}>☀️</span> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: theme === 'dark' ? '2px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: theme === 'dark' ? 'var(--background)' : 'transparent',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '1rem' }}>🌙</span> Dark
            </button>
          </div>
        </div>
      </section>

      {/* Defaults Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '16px' }}>Default Settings</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
            Default Session Duration
          </label>
          <select
            value={defaultDuration}
            onChange={(e) => setDefaultDuration(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {DURATION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
            Default Practice Type
          </label>
          <select
            value={defaultPracticeType}
            onChange={(e) => setDefaultPracticeType(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {BUILT_IN_PRACTICE_TYPES.filter(t => t !== 'other').map(type => (
              <option key={type} value={type}>{practiceTypeLabels[type]}</option>
            ))}
            {customTypes.length > 0 && (
              <option disabled>──────────</option>
            )}
            {customTypes.map(ct => (
              <option key={ct.name} value={ct.name.toLowerCase()}>{ct.name}</option>
            ))}
            <option value="other">{practiceTypeLabels['other']}</option>
          </select>
        </div>
      </section>

      {/* Bell Sound Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '8px' }}>Bell Sound</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Choose the bell sound for your meditation timer.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(BELL_SOUNDS).map(([key, sound]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                border: bellSound === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: bellSound === key ? 'rgba(201, 168, 76, 0.08)' : 'var(--background)',
                cursor: 'pointer',
              }}
              onClick={() => setBellSound(key)}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}>
                <input
                  type="radio"
                  name="bellSound"
                  value={key}
                  checked={bellSound === key}
                  onChange={() => setBellSound(key)}
                  style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
                />
                <div>
                  <span style={{ display: 'block', fontWeight: 500 }}>{sound.name}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                    {sound.description}
                  </span>
                </div>
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  previewBellSound(key)
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}
              >
                Preview
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Practice Types Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '8px' }}>Custom Practice Types</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Add your own meditation practice types (e.g., Jhana, Tonglen, Metta).
        </p>

        {/* Existing custom types */}
        {customTypes.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {customTypes.map(ct => (
                <div
                  key={ct.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{ct.name}</span>
                    {ct.description && (
                      <span style={{ color: 'var(--muted)', fontSize: '0.875rem', marginLeft: '8px' }}>
                        — {ct.description}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomType(ct.name)}
                    disabled={savingCustomTypes}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--error)',
                      backgroundColor: 'transparent',
                      color: 'var(--error)',
                      cursor: savingCustomTypes ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      opacity: savingCustomTypes ? 0.5 : 1,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new custom type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Name (e.g., Jhana)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              style={{
                flex: '1 1 150px',
                minWidth: '150px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
              style={{
                flex: '2 1 200px',
                minWidth: '200px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomType}
              disabled={!newTypeName.trim() || savingCustomTypes}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: newTypeName.trim() && !savingCustomTypes ? 'var(--accent)' : 'var(--border)',
                color: newTypeName.trim() && !savingCustomTypes ? 'var(--background)' : 'var(--muted)',
                cursor: newTypeName.trim() && !savingCustomTypes ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
            >
              {savingCustomTypes ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </section>

      {/* Reminders Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '8px' }}>Reminders</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Get browser notifications to remind you to practice.
        </p>

        {/* Notification Permission */}
        {notificationPermission !== 'granted' && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--background)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              {notificationPermission === 'denied'
                ? 'Notifications are blocked. Please enable them in browser settings.'
                : 'Enable notifications to receive reminders.'}
            </span>
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--background)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Enable
              </button>
            )}
          </div>
        )}

        {/* Meditation Reminder */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '12px',
          }}>
            <input
              type="checkbox"
              checked={meditationReminderEnabled}
              onChange={(e) => setMeditationReminderEnabled(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
            />
            <span>Daily meditation reminder</span>
          </label>
          {meditationReminderEnabled && (
            <input
              type="time"
              value={meditationReminderTime}
              onChange={(e) => setMeditationReminderTime(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                marginLeft: '30px',
              }}
            />
          )}
        </div>

        {/* Journal Reminder */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '12px',
          }}>
            <input
              type="checkbox"
              checked={journalReminderEnabled}
              onChange={(e) => setJournalReminderEnabled(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
            />
            <span>Daily journal reminder</span>
          </label>
          {journalReminderEnabled && (
            <input
              type="time"
              value={journalReminderTime}
              onChange={(e) => setJournalReminderTime(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                marginLeft: '30px',
              }}
            />
          )}
        </div>
      </section>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '16px 32px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: 'var(--accent)',
          color: 'var(--background)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.5 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Data Export Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '8px' }}>Your Data</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
          Download all your meditation sessions and journal entries as a JSON file.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.5 : 1,
            fontSize: '0.875rem',
          }}
        >
          {exporting ? 'Exporting...' : 'Export All Data'}
        </button>
      </section>

      {/* Support & Feedback Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '8px' }}>Support & Feedback</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Found a bug? Have a suggestion? Send us a message and we&apos;ll get back to you.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
              Type
            </label>
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="feedback">General Feedback</option>
              <option value="question">Question</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
              Message
            </label>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              rows={4}
              maxLength={5000}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
            />
          </div>

          {feedbackStatus && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: feedbackStatus.type === 'success' ? 'rgba(85, 176, 133, 0.1)' : 'rgba(224, 85, 85, 0.1)',
              border: `1px solid ${feedbackStatus.type === 'success' ? 'rgba(85, 176, 133, 0.3)' : 'rgba(224, 85, 85, 0.3)'}`,
              color: feedbackStatus.type === 'success' ? 'var(--success)' : 'var(--error)',
              fontSize: '0.875rem',
            }}>
              {feedbackStatus.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleFeedbackSubmit}
            disabled={!feedbackMessage.trim() || sendingFeedback}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: feedbackMessage.trim() && !sendingFeedback ? 'var(--accent)' : 'var(--border)',
              color: feedbackMessage.trim() && !sendingFeedback ? 'var(--background)' : 'var(--muted)',
              cursor: feedbackMessage.trim() && !sendingFeedback ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 500,
              alignSelf: 'flex-start',
            }}
          >
            {sendingFeedback ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      </section>

      {/* Delete Account Section */}
      <section style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--error)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '8px', color: 'var(--error)' }}>
          Delete Account
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid var(--error)',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Delete My Account
          </button>
        ) : (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(224, 85, 85, 0.1)',
            borderRadius: '12px',
          }}>
            <p style={{ marginBottom: '12px', fontSize: '0.875rem' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                marginBottom: '12px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: deleteConfirmText === 'DELETE' ? 'var(--error)' : 'var(--border)',
                  color: deleteConfirmText === 'DELETE' ? 'white' : 'var(--muted)',
                  cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
