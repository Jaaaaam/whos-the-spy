import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ButtonLink } from '../components/Button'
import { cn } from '../lib/cn'

type PageShellProps = {
  children: ReactNode
  compact?: boolean
  showFooter?: boolean
}

const navItems = [
  { to: '/', label: 'Lobby' },
  { to: '/join', label: 'Join' },
]

export function PageShell({
  children,
  compact = false,
  showFooter = true,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/80 shadow-[0_20px_50px_rgba(12,12,31,0.8)] backdrop-blur-xl">
        <nav className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="font-headline text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary sm:text-2xl"
          >
            Neon Enigma
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'font-medium transition-colors',
                    isActive
                      ? 'border-b-2 border-primary pb-1 text-primary'
                      : 'text-on-surface-variant hover:text-secondary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink to="/create" className="hidden px-5 py-2 sm:inline-flex">
              Create
            </ButtonLink>
            <ButtonLink to="/join" variant="secondary" className="px-4 py-2">
              Join
            </ButtonLink>
          </div>
        </nav>
      </header>

      <main
        className={cn(
          'mx-auto w-full px-4 pb-14 pt-24 sm:px-6 lg:px-8',
          compact ? 'max-w-3xl' : 'max-w-screen-2xl',
        )}
      >
        {children}
      </main>

      {showFooter ? (
        <footer className="border-t border-outline-variant/10 bg-surface py-10">
          <div className="mx-auto flex max-w-screen-2xl flex-col items-center gap-4 px-6 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-outline-variant">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Rules</span>
              <span>Support</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-outline-variant">
              Stay in the shadows.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
