import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { PlayerList } from '../../room/components/PlayerList'
import { mockPlayers } from '../../room/data/mockRoom'
import { IntelFeed } from '../components/IntelFeed'
import { Timer } from '../components/Timer'
import { mockGame } from '../data/mockGame'

export function DiscussionPage() {
  const wordLetters = mockGame.secretWord.toUpperCase().split('')

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
              </div>
            </Card>
            <Timer label="Discussion Time" value={mockGame.discussionTimer} progress={45} />
            <ButtonLink
              to="/room/demo/voting"
              className="min-h-24 rounded-[2rem] py-6 text-base md:h-full"
            >
              End Discussion
            </ButtonLink>
          </div>

          <Card
            tone="low"
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-12 text-center"
          >
            <div className="absolute inset-0 noise-grid opacity-10" />
            <div className="relative z-10 max-w-4xl px-2">
              <div className="mb-8 flex items-center justify-center gap-3 text-tertiary">
                <span className="material-symbols-outlined">lock</span>
                <p className="text-xs font-semibold uppercase tracking-[0.35em]">
                  Decrypted Secret Word
                </p>
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3 rounded-[2rem] bg-surface-container-highest/60 p-5 ring-1 ring-outline-variant/20 sm:gap-5 sm:p-8">
                {wordLetters.map((letter, index) => (
                  <div key={`${letter}-${index}`} className="flex flex-col items-center">
                    <span className="font-headline text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-on-surface-variant sm:text-7xl lg:text-8xl">
                      {letter}
                    </span>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-tertiary/20" />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <span className="rounded-full bg-secondary-container px-5 py-3 text-sm font-medium text-on-secondary-container">
                  Category: {mockGame.category}
                </span>
                <span className="rounded-full bg-surface-container-highest px-5 py-3 text-sm font-medium text-on-surface">
                  Round 1
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
