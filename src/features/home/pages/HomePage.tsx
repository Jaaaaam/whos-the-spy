import { HeroSection } from '../components/HeroSection'
import { MenuCard } from '../components/MenuCard'
import { PageShell } from '../../../shared/layouts/PageShell'

export function HomePage() {
  return (
    <PageShell>
      <HeroSection />
      <section className="grid gap-6 pb-8 md:grid-cols-2">
        <MenuCard
          title="Identify Yourself"
          description="Pick a callsign for this session. No account, no setup, just a party room."
          icon="badge"
          to="/create"
          action="Host a Room"
        >
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-tertiary">
              Username
            </span>
            <input
              className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-outline-variant/10 placeholder:text-outline-variant focus:ring-2 focus:ring-tertiary"
              placeholder="Your codename..."
            />
          </label>
        </MenuCard>
        <MenuCard
          title="Join a Room"
          description="Enter the code from your host and jump into the lobby."
          icon="login"
          to="/join"
          action="Use Room Code"
        >
          <div className="rounded-[1rem] bg-surface-container-lowest px-4 py-4 text-center font-headline text-xl font-black tracking-[0.45em] text-on-surface ring-1 ring-outline-variant/10">
            SPY247
          </div>
        </MenuCard>
      </section>
    </PageShell>
  )
}
