import { useMutation } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { HEARTBEAT_INTERVAL_FE_MS } from '../../../../convex/game/constants'

export function useHeartbeat(
  roomId: Id<'rooms'> | undefined,
  playerId: Id<'players'> | undefined,
) {
  const sendHeartbeat = useMutation(api.players.heartbeat)

  useEffect(() => {
    if (!roomId || !playerId) return
    const id = setInterval(() => {
      sendHeartbeat({ playerId, roomId })
    }, HEARTBEAT_INTERVAL_FE_MS)
    return () => clearInterval(id)
  }, [roomId, playerId, sendHeartbeat])
}
