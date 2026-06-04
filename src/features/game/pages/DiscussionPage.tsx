import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { PlayerList } from '../../room/components/PlayerList'
import { mockPlayers } from '../../room/data/mockRoom'
import { IntelFeed } from '../components/IntelFeed'
import { Timer } from '../components/Timer'
import { mockGame } from '../data/mockGame'

export function DiscussionPage() {
  const isCurrentPlayerActive = mockGame.currentPlayer === mockGame.activePlayer
  const turnProgress = (mockGame.currentTurn / mockGame.totalTurns) * 100

  return (
    <PageShell showFooter={false}>
      <div className="grid min-h-[calc(100vh-7rem)] gap-6 py-3 xl:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-6">
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="flex items-center gap-4 rounded-[2rem]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
                <span className="material-symbols-outlined">mic</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-tertiary">
                  Active Player
                </p>
                <h2 className="font-headline text-lg font-extrabold">
                  {mockGame.activePlayer}
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Turn {mockGame.currentTurn} of {mockGame.totalTurns}
                </p>
              </div>
            </Card>
            <Timer
              label="Turn Time"
              value={mockGame.discussionTimer}
              progress={60}
              urgent
            />
            <Button
              className="min-h-24 rounded-[2rem] py-6 text-base md:h-full"
              disabled={!isCurrentPlayerActive}
              type="button"
            >
              {isCurrentPlayerActive ? 'End My Turn' : `Waiting for ${mockGame.activePlayer}`}
            </Button>
          </div>

          <Card
            tone="low"
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-12 text-center"
          >
            <div className="absolute inset-0 noise-grid opacity-10" />
            <div className="relative z-10 max-w-4xl px-2">
              <div className="mb-6 flex items-center justify-center gap-3 text-tertiary">
                <span className="material-symbols-outlined">mic</span>
                <p className="text-xs font-semibold uppercase tracking-[0.35em]">
                  {isCurrentPlayerActive ? 'Your Turn' : 'Discussion In Progress'}
                </p>
              </div>
              <h1 className="font-headline text-4xl font-black tracking-tight sm:text-6xl">
                {isCurrentPlayerActive
                  ? 'Give one clue about your word'
                  : `${mockGame.activePlayer} is giving a clue`}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-on-surface-variant">
                Listen closely, compare each clue, and keep your own word secret.
              </p>

              <div className="mx-auto mt-10 max-w-xl rounded-[2rem] bg-surface-container-highest/60 p-6 ring-1 ring-outline-variant/20 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
                  Your Secret Word
                </p>
                <p className="mt-3 font-headline text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-on-surface-variant sm:text-7xl">
                  {mockGame.secretWord}
                </p>
              </div>

              <div className="mx-auto mt-8 max-w-xl">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <span>Turn Progress</span>
                  <span>
                    {mockGame.currentTurn}/{mockGame.totalTurns}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-tertiary to-primary"
                    style={{ width: `${turnProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <span className="rounded-full bg-surface-container-highest px-5 py-3 text-sm font-medium text-on-surface">
                  Round 1
                </span>
                <span className="rounded-full bg-secondary-container px-5 py-3 text-sm font-medium text-on-secondary-container">
                  Voting starts after every turn
                </span>
              </div>
            </div>
          </Card>
        </section>
        <aside className="grid gap-6 xl:grid-rows-[auto_1fr]">
          <PlayerList players={mockPlayers} />
          <IntelFeed />
        </aside>
      </div>
    </PageShell>
  )
}
