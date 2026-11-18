import Navigation from '@/components/Navigation'
import ReminderChecker from '@/components/ReminderChecker'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isDiaryUser } from '@/lib/diary/access'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-20">
      <Navigation showDiary={isDiaryUser(user?.email)} />
      <ReminderChecker />
      <OfflineIndicator />
      <main className="p-4 md:p-8 max-w-[1200px]">
        {children}
      </main>
    </div>
  )
}
