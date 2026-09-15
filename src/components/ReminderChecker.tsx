'use client'

import { useEffect } from 'react'

export default function ReminderChecker() {
  useEffect(() => {
    // Check reminders every minute
    const checkReminders = async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return
      }

      // The mini's PostgREST token is minted server-side only, so a client
      // component can't query user_settings directly anymore — it goes
      // through this route instead (see src/app/api/reminders/route.ts).
      const response = await fetch('/api/reminders')
      if (!response.ok) return

      const { settings } = await response.json() as {
        settings: {
          meditation_reminder_enabled: boolean
          meditation_reminder_time: string | null
          journal_reminder_enabled: boolean
          journal_reminder_time: string | null
        } | null
      }

      if (!settings) return

      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      // Check meditation reminder
      if (settings.meditation_reminder_enabled && settings.meditation_reminder_time === currentTime) {
        const lastShown = localStorage.getItem('lastMeditationReminder')
        const today = now.toDateString()

        if (lastShown !== today) {
          new Notification('Time to Meditate', {
            body: 'Take a moment to sit and practice.',
            icon: '/favicon.ico',
            tag: 'meditation-reminder',
          })
          localStorage.setItem('lastMeditationReminder', today)
        }
      }

      // Check journal reminder
      if (settings.journal_reminder_enabled && settings.journal_reminder_time === currentTime) {
        const lastShown = localStorage.getItem('lastJournalReminder')
        const today = now.toDateString()

        if (lastShown !== today) {
          new Notification('Journal Reminder', {
            body: 'Reflect on your practice today.',
            icon: '/favicon.ico',
            tag: 'journal-reminder',
          })
          localStorage.setItem('lastJournalReminder', today)
        }
      }
    }

    // Check immediately and then every minute
    checkReminders()
    const interval = setInterval(checkReminders, 60000)

    return () => clearInterval(interval)
  }, [])

  return null
}
