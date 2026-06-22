import { ButtonLink } from '../../../shared/components/Button'
import { MISSION_BRIEFING_ITEMS } from './constants'

export function HeroSection() {
  return (
    <section className="grid items-center gap-10 py-8 lg:grid-cols-12 lg:py-16">
      <div className="space-y-8 lg:col-span-7">
        <div className="space-y-6">
          <p className="text-xs font-bold uppercase tracking-[0.45em] text-tertiary">
            No-login party game
          </p>
          <h1 className="font-headline text-5xl font-extrabold leading-none tracking-tight text-on-surface sm:text-7xl lg:text-8xl">
            ENTER THE{' '}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">
              ENIGMA.
            </span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-on-surface-variant sm:text-xl">
            Create a private room, reveal your secret role, discuss with friends,
            vote, and expose the spy before the neon fog wins.
          </p>
        </div>
        <div className="glass-panel flex flex-col gap-5 rounded-[2rem] border-l-4 border-tertiary p-6 shadow-[0_0_30px_rgba(124,255,254,0.1)] sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
            <span className="material-symbols-outlined text-4xl">mic</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-tertiary">
              Best with Voices
            </h2>
            <p className="text-sm leading-6 text-on-surface-variant">
              This game is best played on a voice or video call. Subtle clues are
              hidden in every pause, laugh, and suspiciously confident answer.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <ButtonLink to="/create" className="py-5 text-base sm:flex-1">
            Create New Game
          </ButtonLink>
          <ButtonLink to="/join" variant="secondary" className="py-5 text-base sm:flex-1">
            Join Room
          </ButtonLink>
        </div>
      </div>
      <aside className="relative overflow-hidden rounded-[3rem] bg-surface-container-high p-8 ring-1 ring-outline-variant/10 lg:col-span-5">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-tertiary/10 blur-3xl" />
        <div className="relative space-y-9">
          <h2 className="flex items-center gap-3 font-headline text-3xl font-black">
            <span className="material-symbols-outlined text-primary">info</span>
            Mission Briefing
          </h2>
          {MISSION_BRIEFING_ITEMS.map((role) => (
            <div key={role.title} className="flex gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-surface-container-highest">
                <span className={`material-symbols-outlined text-4xl ${role.tone}`}>
                  {role.icon}
                </span>
              </div>
              <div>
                <h3 className={`font-headline text-xl font-bold ${role.tone}`}>
                  {role.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  {role.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  )
}
