import { Fragment } from 'react'
import type { Doc } from '../../../../convex/_generated/dataModel'
import { PageShell } from '../../../shared/layouts/PageShell'
import { SuspectCard } from './SuspectCard'
import { VsDivider } from './VsDivider'
import { useNow } from '../hooks/useNow'
import { getSecondsRemaining, formatSeconds } from '../lib/timerUtils'

type RunoffCandidateViewProps = {
  tiedPlayers: Doc<'players'>[]
  votingEndsAt: number | null
  votedCount: number
  eligibleVoterCount: number
}

export function RunoffCandidateView({
  tiedPlayers,
  votingEndsAt,
  votedCount,
  eligibleVoterCount,
}: RunoffCandidateViewProps) {
  const now = useNow()
  const secondsRemaining = votingEndsAt ? getSecondsRemaining(votingEndsAt, now) : 0
  const isTimerUrgent = secondsRemaining <= 10

  return (
    <PageShell showFooter={false}>
      <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-10 py-12">
        <div className="text-center">
          <div className="inline-flex animate-pulse items-center gap-2 rounded-full bg-error/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-error ring-1 ring-error/20">
            <span className="material-symbols-outlined text-sm">warning</span>
            Tiebreaker Round
          </div>
          <h1 className="mt-5 font-headline text-5xl font-black uppercase tracking-tighter sm:text-7xl">
            You're on Trial
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-on-surface-variant">
            The room is deciding your fate. You cannot vote in this round.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl bg-error/10 px-6 py-4 text-center ring-1 ring-error/20">
          <span className="material-symbols-outlined text-error">gavel</span>
          <p className="mt-1 text-sm font-bold text-error">
            {eligibleVoterCount > 0
              ? `${votedCount} of ${eligibleVoterCount} jurors have voted`
              : 'Awaiting verdict...'}
          </p>
        </div>

        {votingEndsAt ? (
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-high px-6 py-4">
            <div className={`font-headline text-3xl font-black tracking-widest ${isTimerUrgent ? 'text-error' : 'text-on-surface'}`}>
              {formatSeconds(secondsRemaining)}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Seconds Remaining
            </div>
          </div>
        ) : null}

        <div className="flex w-full max-w-4xl flex-wrap items-center justify-center md:flex-row md:gap-0">
          {tiedPlayers.map((player, i) => (
            <Fragment key={player._id}>
              {i > 0 && <VsDivider />}
              <SuspectCard name={player.name} />
            </Fragment>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
