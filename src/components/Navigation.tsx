'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/timer', label: 'Meditate', icon: '◯' },
  { href: '/journal', label: 'Journal', icon: '✎' },
  { href: '/stats', label: 'Stats', icon: '◫' },
  { href: '/teacher', label: 'Teacher', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:right-auto md:bottom-0 md:w-20 bg-[var(--surface)] border-t md:border-t-0 md:border-r border-[var(--border)] z-50">
      <div className="flex md:flex-col items-center justify-evenly md:justify-start md:py-6 h-16 md:h-full px-1 md:px-0">
        {/* Logo - visible only on desktop */}
        <Link href="/dashboard" className="hidden md:block mb-8">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] opacity-60 hover:opacity-100 transition-opacity" />
        </Link>

        {/* Nav items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1.5 md:p-3 md:mb-2 rounded-xl transition-colors min-w-0 ${
                isActive
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
              }`}
              title={item.label}
            >
              <span className="text-lg md:text-xl">{item.icon}</span>
              <span className="text-[9px] md:text-xs mt-0.5 md:mt-1">{item.label}</span>
            </Link>
          )
        })}

        {/* Logout - desktop only, at bottom */}
        <form action={logout} className="hidden md:block mt-auto mb-4">
          <button
            type="submit"
            className="flex flex-col items-center justify-center p-3 rounded-xl text-[var(--muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
            title="Sign out"
          >
            <span className="text-xl">↩</span>
            <span className="text-xs mt-1">Logout</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
