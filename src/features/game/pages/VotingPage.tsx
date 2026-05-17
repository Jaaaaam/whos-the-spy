import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { IntelFeed } from '../components/IntelFeed'
import { Timer } from '../components/Timer'
import { VotingCard } from '../components/VotingCard'
import { mockGame } from '../data/mockGame'

export function VotingPage() {
  return (
    <PageShell showFooter={false}>
      <div className="grid min-h-[calc(100vh-7rem)] gap-6 py-3 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-tertiary">
                Phase 4: Deliberation
              </p>
              <h1 className="mt-3 font-headline text-4xl font-black tracking-tight sm:text-6xl">
                Time to Decide
              </h1>
              <p className="mt-3 max-w-xl text-on-surface-variant">
                Cast a mock vote to reveal the infiltrator. Buttons are placeholders
                for now.
              </p>
            </div>
            <Timer label="Seconds Remaining" value={mockGame.votingTimer} progress={75} urgent />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {mockGame.players.map((player, index) => (
              <VotingCard
                key={player.id}
                player={player}
                isSelf={player.name === 'Jam'}
                highlighted={index === 2}
              />
            ))}
          </div>

          <Card tone="low" className="mt-auto flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm text-on-surface-variant">
              4/5 players have voted. Mika is drawing the loudest suspicion.
            </p>
            <ButtonLink to="/room/demo/results" className="shrink-0">
              Show Results
            </ButtonLink>
          </Card>
        </section>
        <aside>
          <IntelFeed />
        </aside>
      </div>
    </PageShell>
  )
}
