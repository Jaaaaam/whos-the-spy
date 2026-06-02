import { Navigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { RevealCard } from '../components/RevealCard'
import { useMyReveal } from '../hooks/useMyReveal'

export function RoleRevealPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const currentPlayerId = getCurrentPlayerId()

  const {
    reveal,
    isLoading: isRevealLoading,
    notFound: isRevealNotFound,
  } = useMyReveal({
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })

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
          roomCode={room.code} />
      </div>
    </PageShell>
  )
}
