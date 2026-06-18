import { Navigate, useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { PlayerList } from '../../room/components/PlayerList'
import { IntelFeed } from '../components/IntelFeed'
import { Timer } from '../components/Timer'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { useDiscussionState } from '../hooks/state/useDiscussionState'
import { usePlayersByRoom } from '../../room/hooks/usePlayersByRoom'
import { useMyReveal } from '../hooks/state/useMyReveal'
import { useEffect, useRef } from 'react'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useEndDiscussionTurn } from '../hooks/actions/useEndDiscussionTurn'
import { useAdvanceDiscussionIfExpired } from '../hooks/advance/useAdvanceDiscussionIfExpired'
import { useNow } from '../hooks/useNow'
import { getSecondsRemaining, formatSeconds, getTimerProgress } from '../lib/timerUtils'

export function DiscussionPage() {
  const { roomCode } = useParams()
  const currentPlayerId = getCurrentPlayerId()
  const { room, isLoading: isRoomLoading, notFound: isRoomNotFound } = useRoomByCode(roomCode)
  const {
    endDiscussionTurn,
    isEndingTurn,
    error: endTurnError,
  } = useEndDiscussionTurn()
  const {
    advanceDiscussionIfExpired,
    isAdvancing,
    error: advanceError,
  } = useAdvanceDiscussionIfExpired()
  const hasRequestedAdvanceRef = useRef(false)

  const {
    discussionState,
    isLoading: isDiscussionLoading,
    notFound: isDiscussionNotFound
  } = useDiscussionState({
    roomId: room?._id,
    roundId: room?.currentRoundId
  })

  const {
    players,
    isLoading: arePlayersLoading,
    isEmpty,
  } = usePlayersByRoom(room?._id)

  const {
    reveal,
    isLoading: isRevealLoading,
    notFound: isRevealNotFound,
  } = useMyReveal({
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })

  const now = useNow()
  const turnEndsAt = discussionState?.round.turnEndsAt
  const secondsRemaining = turnEndsAt ? getSecondsRemaining(turnEndsAt, now) : 0

  useEffect(() => {
    hasRequestedAdvanceRef.current = false
  }, [turnEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.DISCUSSION) return
    if (!turnEndsAt) return
    if (secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceDiscussionIfExpired(room._id, room.currentRoundId).catch(() => {
      hasRequestedAdvanceRef.current = false
    })
  }, [
    advanceDiscussionIfExpired,
    isAdvancing,
    room,
    secondsRemaining,
    turnEndsAt,
  ])

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

  if (room.status === GAME_STATUS.VOTING) {
    return <Navigate to={`/room/${room.code}/voting`} replace />
  }

  if (isDiscussionLoading || arePlayersLoading || isRevealLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading discussion" />
      </PageShell>
    )
  }

  if (isAdvancing) {
    return (
      <PageShell compact>
        <Loader fullPage label="Transitioning" />
      </PageShell>
    )
  }

  if (
    isDiscussionNotFound ||
    !discussionState
  ) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  const isSpectating = isRevealNotFound || !reveal
  const {
    activePlayerId,
    activePlayerName,
    currentTurn,
    totalTurns,
    turnStartedAt,
    turnEndsAt: currentTurnEndsAt,
  } = discussionState.round

  const isCurrentPlayerActive = activePlayerId === currentPlayerId
  const timerProgress = getTimerProgress(currentTurnEndsAt, currentTurnEndsAt - turnStartedAt, now)
  const turnProgress = (currentTurn / totalTurns) * 100
  const roomId = room._id
  const roundId = room.currentRoundId
  const playerId = currentPlayerId

  async function handleEndTurn() {
    if (!isCurrentPlayerActive) return

    await endDiscussionTurn(roomId, roundId, playerId)
  }

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
                  {activePlayerName}
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Turn {currentTurn} of {totalTurns}
                </p>
              </div>
            </Card>
            <Timer
              label="Turn Time"
              value={formatSeconds(secondsRemaining)}
              progress={timerProgress}
              urgent={secondsRemaining <= 10}
            />
            {isSpectating ? (
              <Button
                className="min-h-24 rounded-[2rem] py-6 text-base md:h-full"
                disabled
                type="button"
              >
                Spectating
              </Button>
            ) : (
              <Button
                className="min-h-24 rounded-[2rem] py-6 text-base md:h-full"
                disabled={!isCurrentPlayerActive || isEndingTurn}
                onClick={handleEndTurn}
                type="button"
              >
                {isEndingTurn
                  ? 'Ending Turn...'
                  : isCurrentPlayerActive
                    ? 'End My Turn'
                    : `Waiting for ${activePlayerName}`}
              </Button>
            )}
          </div>
          {endTurnError || advanceError ? (
            <p className="text-center text-sm font-semibold text-error" role="alert">
              {endTurnError ?? advanceError}
            </p>
          ) : null}

          <Card
            tone="low"
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-12 text-center"
          >
            <div className="absolute inset-0 noise-grid opacity-10" />
            <div className="relative z-10 max-w-4xl px-2">
              <div className="mb-6 flex items-center justify-center gap-3 text-tertiary">
                <span className="material-symbols-outlined">mic</span>
                <p className="text-xs font-semibold uppercase tracking-[0.35em]">
                  {isCurrentPlayerActive ? 'Give one clue about your word' : `${activePlayerName} is giving a clue`}
                </p>
              </div>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-on-surface-variant">
                {isSpectating
                  ? 'You\'ve been eliminated. Watch the discussion unfold.'
                  : 'Listen closely, compare each clue, and keep your own word secret.'}
              </p>

              {!isSpectating && <div className="mx-auto mt-10 max-w-xl rounded-[2rem] bg-surface-container-highest/60 p-6 ring-1 ring-outline-variant/20 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
                  Your Secret Word
                </p>
                <p className="mt-3 font-headline text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-on-surface-variant sm:text-7xl">
                  {reveal?.word}
                </p>
              </div>}

              <div className="mx-auto mt-8 max-w-xl">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <span>Turn Progress</span>
                  <span>
                    {currentTurn}/{totalTurns}
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
                  Round {discussionState.round.roundNumber}
                </span>
                <span className="rounded-full bg-secondary-container px-5 py-3 text-sm font-medium text-on-secondary-container">
                  Voting starts after every player has had a turn
                </span>
              </div>
            </div>
          </Card>
        </section>
        <aside className="grid gap-6 xl:grid-rows-[auto_1fr]">
          <PlayerList players={players ?? []} isEmpty={isEmpty} />
          <IntelFeed />
        </aside>
      </div>
    </PageShell>
  )
}
