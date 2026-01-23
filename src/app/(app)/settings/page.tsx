import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
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
