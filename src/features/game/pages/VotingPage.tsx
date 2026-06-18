import { Navigate, useParams } from 'react-router-dom'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Card } from '../../../shared/components/Card'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { IntelFeed } from '../components/IntelFeed'
import { Timer } from '../components/Timer'
import { VotingCard } from '../components/VotingCard'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { usePlayersByRoom } from '../../room/hooks/usePlayersByRoom'
import { useVoteProgress } from '../hooks/state/useVoteProgress'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useCastVote } from '../hooks/actions/useCastVote'
import { useEffect, useRef, useState } from 'react'
import { useFinalizeVoting } from '../hooks/actions/useFinalizeVoting'
import { useAdvanceVotingIfExpired } from '../hooks/advance/useAdvanceVotingIfExpired'
import { useSkipVote } from '../hooks/actions/useSkipVote'

function getSecondsRemaining(votingEndsAt: number, now: number) {
  return Math.max(0, Math.ceil((votingEndsAt - now) / 1_000))
}

function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getTimerProgress(votingEndsAt: number, durationMs: number, now: number) {
  if (durationMs <= 0) return 0
  const remainingMs = votingEndsAt - now
  return Math.max(0, Math.min(100, (remainingMs / durationMs) * 100))
}

export function VotingPage() {
  const hasFinalizedRef = useRef(false)
  const hasRequestedAdvanceRef = useRef(false)
  const { roomCode } = useParams()
  const currentPlayerId = getCurrentPlayerId()

  const { room, isLoading: isRoomLoading, notFound: isRoomNotFound } = useRoomByCode(roomCode)
  const { finalizeVoting, isFinalizingVote, error: finalizationError } = useFinalizeVoting()
  const { advanceVotingIfExpired, isAdvancing } = useAdvanceVotingIfExpired()
  const { skipVote, isSkipping, error: skipError } = useSkipVote()

  const {
    players,
    isLoading: arePlayersLoading,
  } = usePlayersByRoom(room?._id)

  const {
    voteProgress,
    isLoading: isVoteProgressLoading,
  } = useVoteProgress({
    roomId: room?._id,
    roundId: room?.currentRoundId && room.status === GAME_STATUS.VOTING ? room.currentRoundId : undefined,
    voterPlayerId: currentPlayerId,
  })

  const {
    castVote,
    isCastingVote,
    error,
  } = useCastVote()

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  const votingEndsAt = voteProgress?.votingEndsAt ?? null
  const secondsRemaining = votingEndsAt ? getSecondsRemaining(votingEndsAt, now) : 0
  const durationMs = room?.votingDurationMs ?? 60_000
  const timerProgress = votingEndsAt ? getTimerProgress(votingEndsAt, durationMs, now) : 100
  const isTimerUrgent = secondsRemaining <= 10
  const hasVoted = voteProgress?.hasVoted ?? false

  const activePlayers = players?.filter((player) => player.isConnected && !player.isEliminated) ?? []
  const currentPlayer = players?.find(player => player._id === currentPlayerId)
  const isSpectating = currentPlayer?.isEliminated ?? false

  useEffect(() => { hasRequestedAdvanceRef.current = false }, [votingEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.VOTING) return
    if (!votingEndsAt) return
    if (secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceVotingIfExpired(room._id, room.currentRoundId).catch(() => {
      hasRequestedAdvanceRef.current = false
    })
  }, [advanceVotingIfExpired, isAdvancing, room, secondsRemaining, votingEndsAt])

  useEffect(() => {
    if (
      !voteProgress?.isComplete ||
      room?.status !== GAME_STATUS.VOTING ||
      !room.currentRoundId ||
      hasFinalizedRef.current ||
      (votingEndsAt !== null && secondsRemaining === 0)
    ) return

    hasFinalizedRef.current = true
    void finalizeVoting({ roomId: room._id, roundId: room.currentRoundId })
  }, [voteProgress?.isComplete, room?.status, room?.currentRoundId, room?._id, finalizeVoting, secondsRemaining, votingEndsAt])

  async function handleVote(targetPlayerId: Id<'players'>) {
    if (!room?.currentRoundId || !currentPlayerId) return
    await castVote({
      roomId: room._id,
      roundId: room.currentRoundId,
      voterPlayerId: currentPlayerId,
      targetPlayerId,
    })
  }

  async function handleSkip() {
    if (!room?.currentRoundId || !currentPlayerId) return
    await skipVote({ roomId: room._id, roundId: room.currentRoundId, voterPlayerId: currentPlayerId })
  }

  if (isRoomLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading room" />
      </PageShell>
    )
  }

  if (isRoomNotFound || !room || !currentPlayerId) {
    return <Navigate to="/join" replace />
  }

  if (!room.currentRoundId) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (room.status === GAME_STATUS.ROLE_REVEAL) {
    return <Navigate to={`/room/${room.code}/role`} replace />
  }

  if (room.status === GAME_STATUS.DISCUSSION) {
    return <Navigate to={`/room/${room.code}/discussion`} replace />
  }

  if (room.status === GAME_STATUS.RESULTS) {
    return <Navigate to={`/room/${room.code}/results`} replace />
  }

  if (room.status === GAME_STATUS.LOBBY) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (room.status === GAME_STATUS.BATTLE) {
    return <Navigate to={`/room/${room.code}/battle`} replace />
  }

  if (arePlayersLoading || isVoteProgressLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading voting" />
      </PageShell>
    )
  }

  if (isAdvancing || isFinalizingVote) {
    return (
      <PageShell compact>
        <Loader fullPage label="Transitioning" />
      </PageShell>
    )
  }

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
                Choose who you think is the spy. You can change your vote while
                voting is open.
              </p>
            </div>
            {votingEndsAt ? (
              <div className="w-full md:w-48 shrink-0">
                <Timer
                  label="Time remaining"
                  value={formatSeconds(secondsRemaining)}
                  progress={timerProgress}
                  urgent={isTimerUrgent}
                />
              </div>
            ) : null}
          </div>

          {activePlayers.length === 0 ? (
            <Card className="text-center text-on-surface-variant">
              No active players are available to vote for.
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {activePlayers.map((player) => (
                <VotingCard
                  key={player._id}
                  player={player}
                  isSelf={player._id === currentPlayerId}
                  isSelected={voteProgress?.selectedTargetPlayerId === player._id}
                  isAbstained={player._id === currentPlayerId && hasVoted && !voteProgress?.selectedTargetPlayerId}
                  disabled={isSpectating ? true : isCastingVote || hasVoted}
                  isSubmitting={isCastingVote}
                  onVote={isSpectating ? () => { } : () => void handleVote(player._id)}
                />
              ))}
            </div>
          )}

          {error || skipError ? (
            <p className="text-center text-sm font-semibold text-error" role="alert">
              {error ?? skipError}
            </p>
          ) : null}

          {!hasVoted && !isSpectating ? (
            <div className="flex justify-center">
              <button
                onClick={() => void handleSkip()}
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

          {isSpectating ? (
            <Card tone="low" className="mt-auto">
              <p className="text-sm font-semibold text-on-surface-variant">Spectating</p>
            </Card>
          ) : (
            <Card tone="low" className="mt-auto">
              <p className="text-sm text-on-surface-variant">
                {voteProgress
                  ? `${voteProgress.votedCount}/${voteProgress.eligibleVoterCount} players have voted.`
                  : 'Waiting for votes...'}
              </p>
            </Card>
          )}

          {finalizationError ? (
            <p className="text-center text-sm font-semibold text-error" role="alert">
              {finalizationError}{' '}
              <button
                onClick={() => {
                  if (!room.currentRoundId) return
                  void finalizeVoting({ roomId: room._id, roundId: room.currentRoundId })
                }}
                disabled={isFinalizingVote}
                className="underline"
              >
                Retry
              </button>
            </p>
          ) : null}
        </section>
        <aside>
          <IntelFeed />
        </aside>
      </div>
    </PageShell>
  )
}
