import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { PageShell } from '../../../shared/layouts/PageShell'
import { IntelFeed } from './IntelFeed'
import { VotingCard } from './VotingCard'
import { useNow } from '../hooks/useNow'
import { getSecondsRemaining, formatSeconds } from '../lib/timerUtils'

type RunoffVoterViewProps = {
  voteTargets: Doc<'players'>[]
  currentPlayerId: Id<'players'>
  selectedTargetPlayerId: Id<'players'> | null
  hasVoted: boolean
  isCastingVote: boolean
  isSkipping: boolean
  pendingPlayerId: Id<'players'> | null
  votingEndsAt: number | null
  votedCount: number
  eligibleVoterCount: number
  error: string | null
  skipError: string | null
  onVote: (targetPlayerId: Id<'players'>) => void
  onSkip: () => void
}

export function RunoffVoterView({
  voteTargets,
  currentPlayerId,
  selectedTargetPlayerId,
  hasVoted,
  isCastingVote,
  isSkipping,
  pendingPlayerId,
  votingEndsAt,
  votedCount,
  eligibleVoterCount,
  error,
  skipError,
  onVote,
  onSkip,
}: RunoffVoterViewProps) {
  const now = useNow()
  const secondsRemaining = votingEndsAt ? getSecondsRemaining(votingEndsAt, now) : 0
  const isTimerUrgent = secondsRemaining <= 10

  return (
    <PageShell showFooter={false}>
      <div className="grid min-h-[calc(100vh-7rem)] gap-6 py-3 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="inline-flex animate-pulse items-center gap-2 rounded-full bg-error/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-error ring-1 ring-error/20">
                <span className="material-symbols-outlined text-sm">warning</span>
                Tiebreaker Round
              </div>
              <h1 className="mt-3 font-headline text-4xl font-black tracking-tight sm:text-6xl">
                Break the Tie
              </h1>
              <p className="mt-3 max-w-xl text-on-surface-variant">
                The vote was deadlocked. Only the suspects below are eligible targets.
              </p>
            </div>
            {votingEndsAt ? (
              <div className="flex shrink-0 items-center gap-6 rounded-xl border border-outline-variant/20 bg-surface-container-high p-6 shadow-2xl">
                <div className="text-center">
                  <div className={`font-headline text-4xl font-black tracking-widest ${isTimerUrgent ? 'text-error' : 'text-on-surface'}`}>
                    {formatSeconds(secondsRemaining)}
                  </div>
                  <div className="text-[10px] uppercase tracking-tighter text-on-surface-variant">Seconds Remaining</div>
                </div>
                <div className="h-10 w-px bg-outline-variant/30" />
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-bold text-tertiary">Voting Status</div>
                  <div className="relative h-2 w-32 overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-tertiary to-primary transition-all"
                      style={{ width: `${eligibleVoterCount > 0 ? (votedCount / eligibleVoterCount) * 100 : 0}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_#fff]"
                      style={{ left: `calc(${eligibleVoterCount > 0 ? (votedCount / eligibleVoterCount) * 100 : 0}% - 4px)` }}
                    />
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    {`${votedCount}/${eligibleVoterCount} Players Voted`}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {voteTargets.map((player) => (
              <VotingCard
                key={player._id}
                player={player}
                isSelf={player._id === currentPlayerId}
                isSelected={selectedTargetPlayerId === player._id}
                isAbstained={false}
                disabled={isCastingVote || hasVoted}
                isSubmitting={isCastingVote && pendingPlayerId === player._id}
                isRunoffTarget
                onVote={() => onVote(player._id)}
              />
            ))}
          </div>

          {error || skipError ? (
            <p className="text-center text-sm font-semibold text-error" role="alert">
              {error ?? skipError}
            </p>
          ) : null}

          {!hasVoted ? (
            <div className="flex justify-center">
              <button
                onClick={onSkip}
                disabled={isSkipping}
                className="group flex items-center gap-3 px-8 py-3 rounded-full border border-outline-variant/30 bg-surface-container-low hover:bg-surface-bright hover:border-tertiary/50 transition-all duration-300 active:scale-95 shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors">block</span>
                <span className="font-bold font-headline text-sm tracking-widest uppercase text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {isSkipping ? 'Skipping...' : 'Skip Vote'}
                </span>
              </button>
            </div>
          ) : null}
        </section>
        <aside>
          <IntelFeed />
        </aside>
      </div>
    </PageShell>
  )
}
