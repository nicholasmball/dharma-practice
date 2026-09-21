import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import TimerClient from './TimerClient'
import { CustomPracticeType } from '@/lib/types'

export default async function TimerPage() {
  const [user, db] = await Promise.all([getCurrentUser(), createClient()])

  const { data: settings } = await db
    .from('user_settings')
    .select('default_session_duration, default_practice_type, custom_practice_types, bell_sound')
    .eq('user_id', user?.id)
    .single()

  return (
    <TimerClient
      defaultDuration={settings?.default_session_duration || 1200}
      defaultPracticeType={settings?.default_practice_type || 'shamatha'}
      customPracticeTypes={(settings?.custom_practice_types as CustomPracticeType[]) || []}
      bellSound={settings?.bell_sound || 'singing_bowl'}
    />
  )
}
