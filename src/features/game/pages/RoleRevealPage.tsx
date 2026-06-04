import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { RevealCard } from '../components/RevealCard'
import { useMyReveal } from '../hooks/useMyReveal'
import { useMarkRoleSeen } from '../hooks/useMarkRoleSeen'
import { useRound } from '../hooks/useRound'
import { useAdvanceRevealIfExpired } from '../hooks/useAdvanceRevealIfExpired'
import { GAME_STATUS } from '../../../../shared/gameStatus'

function getSecondsRemaining(revealEndsAt: number | undefined, now: number) {
  if (!revealEndsAt) return 0

  return Math.max(0, Math.ceil((revealEndsAt - now) / 1_000))
}

export function RoleRevealPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const currentPlayerId = getCurrentPlayerId()
  const { markRoleSeen, isMarkingSeen, error } = useMarkRoleSeen()
  const {
    advanceRevealIfExpired,
    isAdvancing,
    error: advanceError,
  } = useAdvanceRevealIfExpired()
  const {
    round,
    isLoading: isRoundLoading,
    notFound: isRoundNotFound,
  } = useRound({ roundId: room?.currentRoundId })
  const [now, setNow] = useState(() => Date.now())
  const hasRequestedAdvanceRef = useRef(false)
  const secondsRemaining = getSecondsRemaining(round?.revealEndsAt, now)

  const {
    reveal,
    isLoading: isRevealLoading,
    notFound: isRevealNotFound,
  } = useMyReveal({
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    hasRequestedAdvanceRef.current = false
  }, [round?.revealEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.ROLE_REVEAL) return
    if (!round?.revealEndsAt || secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceRevealIfExpired(room._id, room.currentRoundId)
  }, [advanceRevealIfExpired, isAdvancing, room, round?.revealEndsAt, secondsRemaining])

  async function handleMarkRoleSeen() {
    if (!room?.currentRoundId || !currentPlayerId) return

    await markRoleSeen(room.currentRoundId, currentPlayerId)
  }

  if (isRoomLoading) {
    return (
      <PageShell compact>
        <Card className="my-8 text-center text-on-surface-variant">
          Loading Room...
        </Card>
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
        <Card className="my-8 text-center text-on-surface-variant">
          Loading round...
        </Card>
      </PageShell>
    )
  }

  if (isRoundNotFound || !round) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (isRevealLoading) {
    return (
      <PageShell compact>
        <Card className="my-8 text-center text-on-surface-variant">
          Loading your word...
        </Card>
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
