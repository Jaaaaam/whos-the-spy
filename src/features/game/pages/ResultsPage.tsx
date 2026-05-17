import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { mockGame } from '../data/mockGame'

export function ResultsPage() {
  return (
    <PageShell>
      <section className="relative py-8 text-center">
        <div className="absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="inline-flex rounded-full bg-error-container/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-error ring-1 ring-error/20">
          Threat Neutralized
        </div>
        <h1 className="mt-5 font-headline text-5xl font-extrabold tracking-tight drop-shadow-[0_0_30px_rgba(253,111,133,0.25)] sm:text-7xl">
          SPY ELIMINATED!
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-on-surface-variant">
          The village is safe. The infiltrator was identified before the final
          accusation could bend the room.
        </p>
      </section>

      <div className="grid gap-6 pb-10 md:grid-cols-12">
        <Card tone="glass" className="relative overflow-hidden md:col-span-8">
          <div className="absolute right-6 top-4 opacity-5">
            <span className="material-symbols-outlined text-[10rem]">fingerprint</span>
          </div>
          <div className="relative flex flex-col items-center gap-8 md:flex-row">
            <div className="relative">
              <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] bg-gradient-to-br from-error to-primary font-headline text-5xl font-black text-surface shadow-[0_0_40px_rgba(161,142,255,0.18)] sm:h-48 sm:w-48">
                MK
              </div>
              <div className="absolute -bottom-2 -right-2 rounded-full bg-error p-3 ring-4 ring-surface-container">
                <span className="material-symbols-outlined text-surface">close</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm font-bold uppercase tracking-widest text-tertiary">
                Identity Exposed
              </p>
              <h2 className="mt-2 font-headline text-4xl font-bold sm:text-5xl">
                {mockGame.spy}
              </h2>
              <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="rounded-full bg-secondary-container px-4 py-1 text-xs font-bold uppercase tracking-widest text-on-secondary-container">
                  Spy
                </span>
                <span className="rounded-full bg-surface-container-highest px-4 py-1 text-xs font-bold uppercase tracking-widest text-tertiary">
                  Caught Round 1
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:col-span-4">
          <Card tone="high" className="rounded-[2rem]">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Villager Word
            </p>
            <div className="mt-3 font-headline text-4xl font-black text-primary">
              {mockGame.secretWord}
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">Assigned to the citizens</p>
          </Card>
          <Card className="rounded-[2rem]">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Spy Guess
            </p>
            <div className="mt-3 font-headline text-4xl font-black text-error">
              Mang Inasal
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">Incorrect guess</p>
          </Card>
        </div>

        <Card tone="low" className="md:col-span-12">
          <h2 className="mb-6 font-headline text-xl font-bold">Voting History</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {mockGame.votes.map((vote) => (
              <div
                key={vote.voter}
                className="rounded-[1.25rem] bg-surface-container p-4"
              >
                <p className="font-headline font-bold">{vote.voter}</p>
                <p className="mt-1 text-xs font-medium text-error">
                  Voted for: {vote.target}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mx-auto flex max-w-md flex-col gap-4 pb-8 sm:flex-row">
        <ButtonLink to="/create" className="flex-1 py-5">
          New Game
        </ButtonLink>
        <ButtonLink to="/room/demo" variant="secondary" className="flex-1 py-5">
          Lobby
        </ButtonLink>
      </div>
    </PageShell>
  )
}
