import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const [user, db] = await Promise.all([getCurrentUser(), createClient()])

  const { data: settings } = await db
    .from('user_settings')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '32px' }}>
        Settings
      </h1>

      <SettingsForm
        initialSettings={settings}
        userEmail={user?.email || ''}
      />
    </div>
  )
}
