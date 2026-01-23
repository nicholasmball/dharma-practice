'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateSettings, exportUserData } from './actions'
import { logout } from '@/app/(auth)/actions'
import { PracticeType, practiceTypeLabels } from '@/lib/types'

const PRACTICE_TYPES: PracticeType[] = ['shamatha', 'vipashyana', 'mahamudra', 'dzogchen', 'other']

const DURATION_OPTIONS = [
  { value: 600, label: '10 minutes' },
  { value: 1200, label: '20 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 2700, label: '45 minutes' },
  { value: 3600, label: '60 minutes' },
]

interface SettingsFormProps {
  initialSettings: {
    meditation_reminder_enabled: boolean
    meditation_reminder_time: string | null
    journal_reminder_enabled: boolean
    journal_reminder_time: string | null
    default_session_duration: number
    default_practice_type: string
  } | null
  userEmail: string
}

export default function SettingsForm({ initialSettings, userEmail }: SettingsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Form state
  const [meditationReminderEnabled, setMeditationReminderEnabled] = useState(initialSettings?.meditation_reminder_enabled || false)
  const [meditationReminderTime, setMeditationReminderTime] = useState(initialSettings?.meditation_reminder_time || '07:00')
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(initialSettings?.journal_reminder_enabled || false)
  const [journalReminderTime, setJournalReminderTime] = useState(initialSettings?.journal_reminder_time || '21:00')
  const [defaultDuration, setDefaultDuration] = useState(initialSettings?.default_session_duration || 1200)
  const [defaultPracticeType, setDefaultPracticeType] = useState(initialSettings?.default_practice_type || 'shamatha')

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
        new Notification('Dharma Practice', {
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
            {PRACTICE_TYPES.map(type => (
              <option key={type} value={type}>{practiceTypeLabels[type]}</option>
            ))}
          </select>
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
    </div>
  )
}
