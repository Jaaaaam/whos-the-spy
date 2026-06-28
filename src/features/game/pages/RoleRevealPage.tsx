import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useHeartbeat } from '../../room/hooks/useHeartbeat'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { RevealCard } from '../components/RevealCard'
import { useMyReveal } from '../hooks/state/useMyReveal'
import { useMarkRoleSeen } from '../hooks/actions/useMarkRoleSeen'
import { useRevealState } from '../hooks/state/useRevealState'
import { useAdvanceRevealIfExpired } from '../hooks/advance/useAdvanceRevealIfExpired'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useNow } from '../hooks/useNow'
import { getSecondsRemaining } from '../lib/timerUtils'

export function RoleRevealPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const currentPlayerId = getCurrentPlayerId()
  useHeartbeat(room?._id, currentPlayerId ?? undefined)
  const { markRoleSeen, isMarkingSeen, error } = useMarkRoleSeen()
  const {
    advanceRevealIfExpired,
    isAdvancing,
    error: advanceError,
  } = useAdvanceRevealIfExpired()
  const {
    revealState,
    isLoading: isRoundLoading,
    notFound: isRoundNotFound,
  } = useRevealState({ roundId: room?.currentRoundId })
  const now = useNow()
  const hasRequestedAdvanceRef = useRef(false)
  const secondsRemaining = revealState?.revealEndsAt ? getSecondsRemaining(revealState.revealEndsAt, now) : 0

  const {
    reveal,
    isLoading: isRevealLoading,
    notFound: isRevealNotFound,
  } = useMyReveal({
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })

  useEffect(() => {
    hasRequestedAdvanceRef.current = false
  }, [revealState?.revealEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.ROLE_REVEAL) return
    if (!revealState?.revealEndsAt || secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceRevealIfExpired(room._id, room.currentRoundId)
  }, [advanceRevealIfExpired, isAdvancing, room, revealState?.revealEndsAt, secondsRemaining])

  async function handleMarkRoleSeen() {
    if (!room?.currentRoundId || !currentPlayerId) return

    await markRoleSeen(room.currentRoundId, currentPlayerId)
  }

  if (isRoomLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading room" />
      </PageShell>
    )
  }

  if (notFound || !room) {
    return <Navigate to="/join" replace />
  }

  if (!currentPlayerId) {
    return <Navigate to="/join" replace />
  }

  if (!room.currentRoundId) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (room.status === GAME_STATUS.DISCUSSION) {
    return <Navigate to={`/room/${room.code}/discussion`} replace />
  }

  if (isRoundLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading round" />
      </PageShell>
    )
  }

  if (isRoundNotFound || !revealState) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (isRevealLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading your word" />
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

  if (isRevealNotFound || !reveal) {
    return (
      <PageShell compact>
        <Card className="my-8 space-y-3 text-center">
          <h1 className="font-headline text-4xl font-black">Word not found</h1>
          <p className="text-on-surface-variant">
            You may need to rejoin the room.
          </p>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell compact>
      <div className="py-8">
        <RevealCard
          word={reveal.word}
          secondsRemaining={secondsRemaining}
          onMarkRoleSeen={handleMarkRoleSeen}
          hasMarkedRoleSeen={Boolean(reveal.seenAt)}
          isMarkingSeen={isMarkingSeen} />
        {error || advanceError ? (
          <p className="mt-4 text-center text-sm font-semibold text-error" role="alert">
            {error ?? advanceError}
          </p>
        ) : null}
      </div>
    </PageShell>
  )
}
