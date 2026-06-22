import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
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
  const { pathname } = useLocation()
  const isHome = pathname === '/'

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
          {!isHome && (
            <div className="flex items-center gap-2">
              <ButtonLink to="/create" className="hidden px-5 py-2 sm:inline-flex">
                Create
              </ButtonLink>
              <ButtonLink to="/join" variant="secondary" className="px-4 py-2">
                Join
              </ButtonLink>
            </div>
          )}
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
        <footer className="border-t border-outline-variant/10 bg-surface py-12">
          <div className="mx-auto flex max-w-screen-2xl flex-col items-center gap-5 px-6 text-center">
            <p className="font-headline text-xl font-black tracking-tight">
              <span className="text-on-surface-variant font-normal text-sm mr-2">Built by</span>
              Patricia Jamille Silvestre
            </p>
            <p className="max-w-sm text-sm text-on-surface-variant">
              Turning ideas into products, one component at a time.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://jam-silvestre.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Portfolio"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant transition hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_12px_rgba(161,142,255,0.3)]"
              >
                <span className="material-symbols-outlined text-lg">language</span>
              </a>
              <a
                href="https://github.com/Jaaaaam"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant transition hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_12px_rgba(161,142,255,0.3)]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/patricia-jamille-silvestre-7a5963100/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant transition hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_12px_rgba(161,142,255,0.3)]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-outline-variant">
              © 2026 Neon Enigma · Stay in the shadows.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
