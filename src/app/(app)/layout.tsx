import Navigation from '@/components/Navigation'
import ReminderChecker from '@/components/ReminderChecker'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ paddingLeft: '80px' }}>
      <Navigation />
      <ReminderChecker />
      <main style={{ padding: '32px', maxWidth: '1200px' }}>
        {children}
      </main>
    </div>
  )
}
