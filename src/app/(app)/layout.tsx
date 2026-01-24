import Navigation from '@/components/Navigation'
import ReminderChecker from '@/components/ReminderChecker'
import { OfflineIndicator } from '@/components/OfflineIndicator'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-20">
      <Navigation />
      <ReminderChecker />
      <OfflineIndicator />
      <main className="p-4 md:p-8 max-w-[1200px]">
        {children}
      </main>
    </div>
  )
}
