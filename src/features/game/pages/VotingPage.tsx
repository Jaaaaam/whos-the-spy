import { Navigate, useParams } from 'react-router-dom'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { IntelFeed } from '../components/IntelFeed'
import { VotingCard } from '../components/VotingCard'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { usePlayersByRoom } from '../../room/hooks/usePlayersByRoom'
import { useVoteProgress } from '../hooks/useVoteProgress'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useCastVote } from '../hooks/useCastVote'
import { useEffect, useRef } from 'react'
import { useFinalizeVoting } from '../hooks/useFinalizeVoting'

export function VotingPage() {
  const hasFinalizedRef = useRef(false)
  const { roomCode } = useParams()
  const currentPlayerId = getCurrentPlayerId()

  const { room, isLoading: isRoomLoading, notFound: isRoomNotFound } = useRoomByCode(roomCode)
  const { finalizeVoting, isFinalizingVote, error: finalizationError } = useFinalizeVoting()

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

  const activePlayers = players?.filter((player) => player.isConnected) ?? []

  async function handleVote(targetPlayerId: Id<'players'>) {
    if (!room?.currentRoundId || !currentPlayerId) return

    await castVote({
      roomId: room._id,
      roundId: room.currentRoundId,
      voterPlayerId: currentPlayerId,
      targetPlayerId,
    })
  }

  useEffect(() => {
    if (
      !voteProgress?.isComplete ||
      room?.status !== GAME_STATUS.VOTING ||
      !room.currentRoundId ||
      hasFinalizedRef.current
    ) return

    hasFinalizedRef.current = true
    void finalizeVoting({ roomId: room._id, roundId: room.currentRoundId })
  }, [voteProgress?.isComplete, room?.status, room?.currentRoundId, room?._id, finalizeVoting])

  if (isRoomLoading) {
    return (
      <PageShell compact>
        <Card className="my-8 text-center text-on-surface-variant">
          Loading room...
        </Card>
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

  if (arePlayersLoading || isVoteProgressLoading) {
    return (
      <PageShell compact>
        <Card className="my-8 text-center text-on-surface-variant">
          Loading voting...
        </Card>
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
                  disabled={isCastingVote}
                  isSubmitting={isCastingVote}
                  onVote={() => void handleVote(player._id)}
                />
              ))}
            </div>
          )}
          {error ? (
            <p className="text-center text-sm font-semibold text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Card tone="low" className="mt-auto">
            <p className="text-sm text-on-surface-variant">
              {voteProgress
                ? `${voteProgress.votedCount}/${voteProgress.eligibleVoterCount} players have voted.`
                : 'Waiting for votes...'}
            </p>
          </Card>
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
